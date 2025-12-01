import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'database', 'rfb-inventory.json');
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Database structure for RFB Inventory
interface Database {
  raw_materials: any[];
  purchase_batches: any[];
  recipes: any[];
  recipe_ingredients: any[];
  production_logs: any[];
  users: any[];
  shop_settings: any[];
  packing_materials: any[];
  packing_purchases: any[];
  deleted_items: any[]; // Store deleted items with category and timestamp
}

let db: Database = {
  raw_materials: [],
  purchase_batches: [],
  recipes: [],
  recipe_ingredients: [],
  production_logs: [],
  users: [],
  shop_settings: [],
  packing_materials: [],
  packing_purchases: [],
  deleted_items: [],
};

// Load database
function loadDatabase(): Database {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      const loaded = JSON.parse(data);
      // Ensure all tables exist
      return {
        raw_materials: loaded.raw_materials || [],
        purchase_batches: loaded.purchase_batches || [],
        recipes: loaded.recipes || [],
        recipe_ingredients: loaded.recipe_ingredients || [],
        production_logs: loaded.production_logs || [],
        users: loaded.users || [],
        shop_settings: loaded.shop_settings || [],
        packing_materials: loaded.packing_materials || [],
        packing_purchases: loaded.packing_purchases || [],
        deleted_items: loaded.deleted_items || [],
      };
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
  return {
    raw_materials: [],
    purchase_batches: [],
    recipes: [],
    recipe_ingredients: [],
    production_logs: [],
    users: [],
    shop_settings: [],
    packing_materials: [],
    packing_purchases: [],
    deleted_items: [],
  };
}

// Save database
function saveDatabase() {
  try {
    // Ensure deleted_items exists
    if (!db.deleted_items) {
      db.deleted_items = [];
    }
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    // Verify write
    const verify = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    console.log('Database saved. Deleted items count:', verify.deleted_items?.length || 0);
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Reload database from file
export function reloadDatabase() {
  db = loadDatabase();
}

// Get table name from SQL-like query or direct table name
function getTableName(query: string): keyof Database | null {
  // Try SQL pattern first
  const tableMatch = query.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
  if (tableMatch) {
    const tableName = tableMatch[1];
    // Map SQL table names to our database keys
    const tableMap: Record<string, keyof Database> = {
      raw_materials: 'raw_materials',
      purchase_batches: 'purchase_batches',
      recipes: 'recipes',
      recipe_ingredients: 'recipe_ingredients',
      production_logs: 'production_logs',
      users: 'users',
      shop_settings: 'shop_settings',
    };
    return tableMap[tableName] || null;
  }
  return null;
}

// Helper to generate ID (similar to cuid)
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Initialize database
export function initDatabase() {
  db = loadDatabase();

  // Initialize default admin user
  if (db.users.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.users.push({
      id: generateId(),
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Initialize default shop settings
  if (db.shop_settings.length === 0) {
    db.shop_settings.push({
      id: generateId(),
      shopName: 'RISHA FOODS AND BAKERY',
      shopAddress: 'Server No: 103/1A2, Agaramel, Poonamallee Taluk, Chennai - 600123',
      shopEmail: 'rishafoodsandbakery@gmail.com',
      shopPhone: '',
      currency: '₹',
      taxRate: 0,
      printTextSize: 'medium',
      logoUrl: '',
      // Production counters (reset separately without deleting data)
      totalProductionRuns: 0,
      totalProductionCost: 0,
      todayProductionCost: 0,
      lastResetDate: null,
      updatedAt: new Date().toISOString(),
    });
  } else {
    // Ensure existing settings have counter fields and logoUrl
    db.shop_settings.forEach((setting: any) => {
      if (setting.totalProductionRuns === undefined) setting.totalProductionRuns = 0;
      if (setting.totalProductionCost === undefined) setting.totalProductionCost = 0;
      if (setting.todayProductionCost === undefined) setting.todayProductionCost = 0;
      if (setting.lastResetDate === undefined) setting.lastResetDate = null;
      if (setting.logoUrl === undefined) setting.logoUrl = '';
    });
  }

  // Packing materials initialization removed - user will add manually

  saveDatabase();
}

// Database interface compatible with Prisma-style queries
class DatabaseClient {
  // Raw material methods
  rawMaterial = {
    findMany: (options?: any) => {
      let items = [...db.raw_materials];
      
      if (options?.where) {
        Object.keys(options.where).forEach(key => {
          if (options.where[key] !== undefined) {
            items = items.filter(item => item[key] === options.where[key]);
          }
        });
      }
      
      // Handle includes for relations
      const result = items.map(item => {
        // Flatten nested data structure if it exists (for backward compatibility)
        let resultItem: any;
        if (item.data && typeof item.data === 'object') {
          // Old nested structure - flatten it
          resultItem = {
            id: item.id,
            ...item.data,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
        } else {
          // Already flat structure
          resultItem = { ...item };
        }
        
        // Ensure name and unit are always present
        if (!resultItem.name) resultItem.name = 'Unknown Material';
        if (!resultItem.unit) resultItem.unit = 'pieces';
        if (resultItem.isEssential === undefined) resultItem.isEssential = false;
        
        if (options?.include?.purchaseBatches) {
          const batches = db.purchase_batches
            .filter(batch => batch.rawMaterialId === resultItem.id);
          
          // Apply filters from include
          let filteredBatches = batches;
          if (options.include.purchaseBatches.where) {
            if (options.include.purchaseBatches.where.remainingQty) {
              if (options.include.purchaseBatches.where.remainingQty.gt !== undefined) {
                filteredBatches = filteredBatches.filter(
                  b => (b.remainingQty || 0) > options.include.purchaseBatches.where.remainingQty.gt
                );
              }
            }
          }
          
          // Apply ordering
          if (options.include.purchaseBatches.orderBy) {
            const key = Object.keys(options.include.purchaseBatches.orderBy)[0];
            const order = options.include.purchaseBatches.orderBy[key] || 'asc';
            filteredBatches.sort((a, b) => {
              const aVal = a[key];
              const bVal = b[key];
              if (order === 'desc') {
                return bVal > aVal ? 1 : -1;
              }
              return aVal > bVal ? 1 : -1;
            });
          }
          
          resultItem.purchaseBatches = filteredBatches;
        }
        
        return resultItem;
      });
      
      if (options?.orderBy) {
        const key = Object.keys(options.orderBy)[0];
        const order = options.orderBy[key] || 'asc';
        result.sort((a, b) => {
          if (order === 'desc') {
            return b[key] > a[key] ? 1 : -1;
          }
          return a[key] > b[key] ? 1 : -1;
        });
      }
      
      return result;
    },
    
    findUnique: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const item = db.raw_materials.find(item => {
        // Check both flat and nested structures
        if (item[key] === where[key]) return true;
        if (item.data && item.data[key] === where[key]) return true;
        if (key === 'id' && (item[key] === where[key] || item.id === where[key])) return true;
        return false;
      });
      
      if (!item) return null;
      
      // Flatten if nested
      if (item.data && typeof item.data === 'object') {
        return {
          id: item.id,
          ...item.data,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }
      return item;
    },
    
    findFirst: (options?: any) => {
      const results = this.rawMaterial.findMany(options);
      return results[0] || null;
    },
    
    create: (options: any) => {
      // Handle both { data: {...} } and direct data format
      const data = options.data || options;
      
      // Validate required fields
      if (!data.name || !data.unit) {
        throw new Error('Name and unit are required');
      }
      
      // Check for unique constraint (name must be unique)
      const existing = db.raw_materials.find(item => {
        const itemName = item.data?.name || item.name;
        return itemName && itemName.toLowerCase() === data.name.toLowerCase().trim();
      });
      if (existing) {
        const error: any = new Error('Unique constraint failed');
        error.code = 'P2002';
        throw error;
      }
      
      // Save as flat structure (not nested) - explicitly set all fields
      const newItem: any = {
        id: generateId(),
        name: (data.name || '').trim(),
        unit: data.unit || 'pieces',
        isEssential: data.isEssential === true || data.isEssential === 'true',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      db.raw_materials.push(newItem);
      saveDatabase();
      
      // Return with all fields explicitly set
      return {
        id: newItem.id,
        name: newItem.name,
        unit: newItem.unit,
        isEssential: newItem.isEssential,
        createdAt: newItem.createdAt,
        updatedAt: newItem.updatedAt,
      };
    },
    
    update: (options: { where: any; data: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.raw_materials.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        db.raw_materials[index] = {
          ...db.raw_materials[index],
          ...options.data,
          updatedAt: new Date().toISOString(),
        };
        saveDatabase();
        return db.raw_materials[index];
      }
      return null;
    },
    
    delete: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.raw_materials.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        const deleted = db.raw_materials.splice(index, 1)[0];
        saveDatabase();
        return deleted;
      }
      return null;
    },
    
    deleteMany: (options?: { where?: any }) => {
      if (!options || !options.where) {
        const count = db.raw_materials.length;
        db.raw_materials = [];
        saveDatabase();
        return { count };
      }
      
      const initialLength = db.raw_materials.length;
      db.raw_materials = db.raw_materials.filter(item => {
        let keep = true;
        Object.keys(options.where).forEach(key => {
          if (item[key] === options.where[key]) {
            keep = false;
          }
        });
        return keep;
      });
      const deleted = initialLength - db.raw_materials.length;
      if (deleted > 0) {
        saveDatabase();
      }
      return { count: deleted };
    },
  };

  // Purchase batch methods
  purchaseBatch = {
    findMany: (options?: any) => {
      let items = [...db.purchase_batches];
      
      if (options?.where) {
        Object.keys(options.where).forEach(key => {
          if (options.where[key] !== undefined) {
            if (typeof options.where[key] === 'object') {
              if (options.where[key]?.in) {
                // Handle { in: [...] } syntax
                items = items.filter(item => options.where[key].in.includes(item[key]));
              } else if (options.where[key]?.gt !== undefined) {
                // Handle { gt: number } syntax
                items = items.filter(item => item[key] > options.where[key].gt);
              } else if (options.where[key]?.gte !== undefined) {
                items = items.filter(item => item[key] >= options.where[key].gte);
              } else if (options.where[key]?.lt !== undefined) {
                items = items.filter(item => item[key] < options.where[key].lt);
              } else if (options.where[key]?.lte !== undefined) {
                items = items.filter(item => item[key] <= options.where[key].lte);
              }
            } else {
              items = items.filter(item => item[key] === options.where[key]);
            }
          }
        });
      }
      
      // Handle includes for relations
      let result = items.map(item => {
        const resultItem: any = { ...item };
        
        if (options?.include?.rawMaterial) {
          const material = db.raw_materials.find(rm => rm.id === item.rawMaterialId);
          if (material) {
            // Flatten material if nested
            if (material.data && typeof material.data === 'object') {
              resultItem.rawMaterial = {
                id: material.id,
                ...material.data,
                createdAt: material.createdAt,
                updatedAt: material.updatedAt,
              };
            } else {
              resultItem.rawMaterial = material;
            }
          } else {
            resultItem.rawMaterial = null;
          }
        }
        
        return resultItem;
      });
      
      if (options?.orderBy) {
        const key = Object.keys(options.orderBy)[0];
        const order = options.orderBy[key] || 'asc';
        result.sort((a, b) => {
          const aVal = a[key];
          const bVal = b[key];
          // Handle date comparisons
          if (aVal && bVal && (typeof aVal === 'string' && aVal.includes('T'))) {
            const aDate = new Date(aVal);
            const bDate = new Date(bVal);
            if (order === 'desc') {
              return bDate > aDate ? 1 : -1;
            }
            return aDate > bDate ? 1 : -1;
          }
          if (order === 'desc') {
            return bVal > aVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }
      
      return result;
    },
    
    findUnique: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      return db.purchase_batches.find(item => item[key] === where[key]) || null;
    },
    
    findFirst: (options?: any) => {
      const results = this.purchaseBatch.findMany(options);
      return results[0] || null;
    },
    
    create: (options: any) => {
      // Handle both { data: {...} } and direct data format
      const data = options.data || options;
      
      // Validate required fields BEFORE creating
      if (!data.rawMaterialId) {
        console.error('Purchase create - missing rawMaterialId:', data);
        throw new Error('rawMaterialId is required');
      }
      if (!data.quantity || parseFloat(data.quantity) <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      
      // Save as flat structure (not nested in "data" object)
      const qty = parseFloat(data.quantity) || 0;
      const price = parseFloat(data.unitPrice) || 0;
      const total = data.totalCost !== undefined ? parseFloat(data.totalCost) : (qty * price);
      const remaining = data.remainingQty !== undefined ? parseFloat(data.remainingQty) : qty;
      
      // CRITICAL: Ensure rawMaterialId is explicitly set and not null
      const rawMaterialId = String(data.rawMaterialId).trim();
      if (!rawMaterialId || rawMaterialId === 'null' || rawMaterialId === 'undefined') {
        throw new Error('rawMaterialId must be a valid string');
      }
      
      // CRITICAL: Create clean item directly - NO nested structures, NO extra properties
      const finalItem = {
        id: generateId(),
        rawMaterialId: rawMaterialId,
        quantity: qty,
        unit: data.unit || 'kg',
        unitPrice: price,
        totalCost: total,
        remainingQty: remaining,
        purchaseDate: data.purchaseDate || new Date().toISOString(),
        gasCylinderQty: data.gasCylinderQty ? parseFloat(data.gasCylinderQty) : null,
      };
      
      // Verify rawMaterialId is valid BEFORE saving
      if (!finalItem.rawMaterialId || finalItem.rawMaterialId === 'undefined' || finalItem.rawMaterialId === 'null') {
        throw new Error(`rawMaterialId is required. Got: ${finalItem.rawMaterialId}`);
      }
      
      // Push to database array
      db.purchase_batches.push(finalItem);
      saveDatabase();
      
      // Verify it was saved correctly
      const saved = db.purchase_batches[db.purchase_batches.length - 1];
      if (!saved || saved.id !== finalItem.id || !saved.rawMaterialId) {
        throw new Error('Failed to save purchase batch correctly');
      }
      
      // Return the saved item
      return finalItem;
    },
    
    update: (options: { where: any; data: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.purchase_batches.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        const currentItem = db.purchase_batches[index];
        const updateData: any = { ...options.data };
        
        // Handle decrement operation (for remainingQty)
        if (updateData.remainingQty && typeof updateData.remainingQty === 'object' && updateData.remainingQty.decrement !== undefined) {
          updateData.remainingQty = (currentItem.remainingQty || 0) - updateData.remainingQty.decrement;
        }
        
        // Handle increment operation (if needed in future)
        if (updateData.remainingQty && typeof updateData.remainingQty === 'object' && updateData.remainingQty.increment !== undefined) {
          updateData.remainingQty = (currentItem.remainingQty || 0) + updateData.remainingQty.increment;
        }
        
        db.purchase_batches[index] = {
          ...currentItem,
          ...updateData,
        };
        saveDatabase();
        return db.purchase_batches[index];
      }
      return null;
    },
    
    updateMany: (options: { where: any; data: any }) => {
      const where = options.where;
      let updated = 0;
      db.purchase_batches.forEach((item, index) => {
        let matches = true;
        Object.keys(where).forEach(key => {
          if (item[key] !== where[key]) {
            matches = false;
          }
        });
        if (matches) {
          db.purchase_batches[index] = {
            ...db.purchase_batches[index],
            ...options.data,
          };
          updated++;
        }
      });
      if (updated > 0) {
        saveDatabase();
      }
      return { count: updated };
    },
    
    delete: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.purchase_batches.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        const deleted = db.purchase_batches.splice(index, 1)[0];
        saveDatabase();
        return deleted;
      }
      return null;
    },
    
    deleteMany: (options?: { where?: any }) => {
      if (!options || !options.where) {
        const count = db.purchase_batches.length;
        db.purchase_batches = [];
        saveDatabase();
        return { count };
      }
      
      const initialLength = db.purchase_batches.length;
      db.purchase_batches = db.purchase_batches.filter(item => {
        let keep = true;
        Object.keys(options.where).forEach(key => {
          if (item[key] === options.where[key]) {
            keep = false;
          }
        });
        return keep;
      });
      const deleted = initialLength - db.purchase_batches.length;
      if (deleted > 0) {
        saveDatabase();
      }
      return { count: deleted };
    },
  };

  // Recipe methods
  recipe = {
    findMany: (options?: any) => {
      let items = [...db.recipes];
      
      if (options?.where) {
        Object.keys(options.where).forEach(key => {
          if (options.where[key] !== undefined) {
            items = items.filter(item => item[key] === options.where[key]);
          }
        });
      }
      
      if (options?.include) {
        if (options.include.ingredients) {
          items = items.map(item => ({
            ...item,
            ingredients: db.recipe_ingredients.filter(ri => ri.recipeId === item.id)
              .map(ri => ({
                ...ri,
                rawMaterial: db.raw_materials.find(rm => rm.id === ri.rawMaterialId) || null,
              })),
          }));
        }
      }
      
      if (options?.orderBy) {
        const key = Object.keys(options.orderBy)[0];
        const order = options.orderBy[key] || 'asc';
        items.sort((a, b) => {
          if (order === 'desc') {
            return b[key] > a[key] ? 1 : -1;
          }
          return a[key] > b[key] ? 1 : -1;
        });
      }
      
      return items;
    },
    
    findUnique: (options: { where: any; include?: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const recipe = db.recipes.find(item => item[key] === where[key]);
      
      if (!recipe) return null;
      
      // Handle includes
      if (options.include) {
        const result: any = { ...recipe };
        
        if (options.include.ingredients) {
          result.ingredients = db.recipe_ingredients
            .filter(ri => ri.recipeId === recipe.id)
            .map(ri => {
              const ingredient: any = { ...ri };
              
              // Include rawMaterial if requested
              if (options.include.ingredients.include?.rawMaterial) {
                const material = db.raw_materials.find(rm => rm.id === ri.rawMaterialId);
                if (material) {
                  // Flatten material if nested
                  if (material.data && typeof material.data === 'object') {
                    ingredient.rawMaterial = {
                      id: material.id,
                      ...material.data,
                      createdAt: material.createdAt,
                      updatedAt: material.updatedAt,
                    };
                  } else {
                    ingredient.rawMaterial = material;
                  }
                } else {
                  ingredient.rawMaterial = null;
                }
              }
              
              return ingredient;
            });
        }
        
        return result;
      }
      
      return recipe;
    },
    
    findFirst: (options?: any) => {
      const results = this.recipe.findMany(options);
      return results[0] || null;
    },
    
    create: async (options: any) => {
      // Handle both { data: {...} } and direct data format
      const data = options.data || options;
      
      // Validate required fields
      if (!data.name) {
        throw new Error('Recipe name is required');
      }
      
      // Check for unique constraint (name must be unique)
      const existing = db.recipes.find(item => {
        const itemName = item.name || '';
        return itemName.toLowerCase() === data.name.toLowerCase().trim();
      });
      if (existing) {
        const error: any = new Error('Unique constraint failed');
        error.code = 'P2002';
        throw error;
      }
      
      // Handle nested creates (ingredients)
      const recipeData: any = { ...data };
      let ingredientsToCreate: any[] = [];
      
      if (data.ingredients && data.ingredients.create && Array.isArray(data.ingredients.create)) {
        ingredientsToCreate = data.ingredients.create;
        delete recipeData.ingredients; // Remove from recipe data
      }
      
      const recipeId = generateId();
      
      // Save recipe with all required fields explicitly set
      const newItem: any = {
        id: recipeId,
        name: (data.name || '').trim(),
        outputQty: data.outputQty ? parseFloat(data.outputQty) : 0,
        outputUnit: data.outputUnit || 'pieces',
        unitWeight: data.unitWeight ? parseFloat(data.unitWeight) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      db.recipes.push(newItem);
      
      // Create ingredients if provided
      if (ingredientsToCreate.length > 0) {
        ingredientsToCreate.forEach((ing: any) => {
          if (ing.rawMaterialId && ing.quantity) {
            db.recipe_ingredients.push({
              id: generateId(),
              recipeId: recipeId,
              rawMaterialId: ing.rawMaterialId,
              quantity: parseFloat(ing.quantity) || 0,
              unit: ing.unit || 'kg',
            });
          }
        });
      }
      
      saveDatabase();
      
      // Return with included ingredients if requested
      const result: any = { ...newItem };
      if (ingredientsToCreate.length > 0) {
        result.ingredients = db.recipe_ingredients
          .filter(ri => ri.recipeId === recipeId)
          .map((ri: any) => {
            const material = db.raw_materials.find(rm => rm.id === ri.rawMaterialId);
            return {
              id: ri.id,
              recipeId: ri.recipeId,
              rawMaterialId: ri.rawMaterialId,
              quantity: ri.quantity,
              unit: ri.unit,
              rawMaterial: material || null,
            };
          });
      } else {
        result.ingredients = [];
      }
      
      return result;
    },
    
    update: (options: { where: any; data: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.recipes.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        db.recipes[index] = {
          ...db.recipes[index],
          ...options.data,
          updatedAt: new Date().toISOString(),
        };
        saveDatabase();
        return db.recipes[index];
      }
      return null;
    },
    
    delete: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.recipes.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        // Also delete related ingredients
        db.recipe_ingredients = db.recipe_ingredients.filter(ri => ri.recipeId !== db.recipes[index].id);
        const deleted = db.recipes.splice(index, 1)[0];
        saveDatabase();
        return deleted;
      }
      return null;
    },
    
    deleteMany: (options?: { where?: any }) => {
      if (!options || !options.where) {
        const count = db.recipes.length;
        db.recipes = [];
        saveDatabase();
        return { count };
      }
      
      const initialLength = db.recipes.length;
      db.recipes = db.recipes.filter(item => {
        let keep = true;
        Object.keys(options.where).forEach(key => {
          if (item[key] === options.where[key]) {
            keep = false;
          }
        });
        return keep;
      });
      const deleted = initialLength - db.recipes.length;
      if (deleted > 0) {
        saveDatabase();
      }
      return { count: deleted };
    },
  };

  // Recipe ingredient methods
  recipeIngredient = {
    findMany: (options?: any) => {
      let items = [...db.recipe_ingredients];
      
      if (options?.where) {
        Object.keys(options.where).forEach(key => {
          if (options.where[key] !== undefined) {
            items = items.filter(item => item[key] === options.where[key]);
          }
        });
      }
      
      return items;
    },
    
    create: (options: any) => {
      // Handle both { data: {...} } and direct data format
      const data = options.data || options;
      const newItem = {
        id: generateId(),
        ...data,
      };
      db.recipe_ingredients.push(newItem);
      saveDatabase();
      return newItem;
    },
    
    createMany: (data: any[]) => {
      const newItems = data.map(item => ({
        id: generateId(),
        ...item,
      }));
      db.recipe_ingredients.push(...newItems);
      saveDatabase();
      return { count: newItems.length };
    },
    
    deleteMany: (options: { where: any }) => {
      const where = options.where;
      const initialLength = db.recipe_ingredients.length;
      db.recipe_ingredients = db.recipe_ingredients.filter(item => {
        let keep = true;
        Object.keys(where).forEach(key => {
          if (item[key] === where[key]) {
            keep = false;
          }
        });
        return keep;
      });
      const deleted = initialLength - db.recipe_ingredients.length;
      if (deleted > 0) {
        saveDatabase();
      }
      return { count: deleted };
    },
  };

  // Production log methods
  productionLog = {
    findMany: (options?: any) => {
      let items = [...db.production_logs];
      
      if (options?.where) {
        Object.keys(options.where).forEach(key => {
          if (options.where[key] !== undefined) {
            if (typeof options.where[key] === 'object') {
              if (options.where[key]?.gte !== undefined) {
                // Handle date range queries
                const date = new Date(options.where[key].gte);
                items = items.filter(item => new Date(item[key]) >= date);
              } else if (options.where[key]?.lte !== undefined) {
                const date = new Date(options.where[key].lte);
                items = items.filter(item => new Date(item[key]) <= date);
              } else if (options.where[key]?.gt !== undefined) {
                const date = new Date(options.where[key].gt);
                items = items.filter(item => new Date(item[key]) > date);
              } else if (options.where[key]?.lt !== undefined) {
                const date = new Date(options.where[key].lt);
                items = items.filter(item => new Date(item[key]) < date);
              }
            } else {
              items = items.filter(item => item[key] === options.where[key]);
            }
          }
        });
      }
      
      // Handle includes for relations
      let result = items;
      if (options?.include) {
        if (options.include.recipe) {
          result = items.map(item => ({
            ...item,
            recipe: db.recipes.find(r => r.id === item.recipeId) || null,
          }));
        }
      }
      
      if (options?.orderBy) {
        const key = Object.keys(options.orderBy)[0];
        const order = options.orderBy[key] || 'desc';
        result.sort((a, b) => {
          const aVal = a[key];
          const bVal = b[key];
          // Handle date comparisons
          if (aVal && bVal && (typeof aVal === 'string' && aVal.includes('T'))) {
            const aDate = new Date(aVal);
            const bDate = new Date(bVal);
            if (order === 'desc') {
              return bDate > aDate ? 1 : -1;
            }
            return aDate > bDate ? 1 : -1;
          }
          if (order === 'desc') {
            return bVal > aVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }
      
      return result;
    },
    
    findUnique: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      return db.production_logs.find(item => item[key] === where[key]) || null;
    },
    
    deleteMany: (options?: { where?: any }) => {
      // If no options or empty where clause, delete all
      if (!options || !options.where || Object.keys(options.where).length === 0) {
        const count = db.production_logs.length;
        db.production_logs = [];
        saveDatabase();
        return { count };
      }
      
      // Handle date range queries in where clause
      const initialLength = db.production_logs.length;
      db.production_logs = db.production_logs.filter(item => {
        let keep = true;
        Object.keys(options.where).forEach(key => {
          const whereValue = options.where[key];
          
          // Handle date range queries (gte, lt, etc.)
          if (typeof whereValue === 'object' && whereValue !== null) {
            if (whereValue.gte !== undefined) {
              const filterDate = new Date(whereValue.gte);
              const itemDate = new Date(item[key]);
              if (itemDate < filterDate) {
                keep = false;
              }
            }
            if (whereValue.lt !== undefined) {
              const filterDate = new Date(whereValue.lt);
              const itemDate = new Date(item[key]);
              if (itemDate >= filterDate) {
                keep = false;
              }
            }
          } else if (item[key] === whereValue) {
            keep = false;
          }
        });
        return keep;
      });
      const deleted = initialLength - db.production_logs.length;
      if (deleted > 0) {
        saveDatabase();
      }
      return { count: deleted };
    },
    
    create: (options: any) => {
      // Handle both { data: {...} } and direct data format
      const data = options.data || options;
      
      const newItem: any = {
        id: generateId(),
        recipeId: data.recipeId,
        batches: data.batches ? parseInt(data.batches) : 0,
        totalCost: data.totalCost ? parseFloat(data.totalCost) : 0,
        costPerUnit: data.costPerUnit ? parseFloat(data.costPerUnit) : 0,
        productionDate: data.productionDate || new Date().toISOString(),
        variantName: data.variantName || null,
        baseRecipeCost: data.baseRecipeCost ? parseFloat(data.baseRecipeCost) : null,
        additionalCost: data.additionalCost ? parseFloat(data.additionalCost) : null,
        utilityCost: data.utilityCost ? parseFloat(data.utilityCost) : 0,
        staffSalary: data.staffSalary ? parseFloat(data.staffSalary) : 0,
        costBreakdown: typeof data.costBreakdown === 'string' 
          ? data.costBreakdown 
          : JSON.stringify(data.costBreakdown || '{}'),
        variantIngredients: data.variantIngredients 
          ? (typeof data.variantIngredients === 'string'
              ? data.variantIngredients
              : JSON.stringify(data.variantIngredients))
          : null,
      };
      
      db.production_logs.push(newItem);
      saveDatabase();
      
      // Handle include option (for recipe relation)
      if (options.include && options.include.recipe) {
        const recipe = db.recipes.find(r => r.id === newItem.recipeId);
        return {
          ...newItem,
          recipe: recipe || null,
        };
      }
      
      return newItem;
    },
  };

  // User methods
  user = {
    findMany: (options?: any) => {
      let items = [...db.users];
      
      // Flatten any nested data structures for backward compatibility
      items = items.map((item: any) => {
        if (item.data) {
          // User has nested data structure, flatten it
          return {
            ...item.data,
            id: item.id,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          };
        }
        return item;
      });
      
      if (options?.where) {
        Object.keys(options.where).forEach(key => {
          if (options.where[key] !== undefined) {
            items = items.filter(item => item[key] === options.where[key]);
          }
        });
      }
      
      return items;
    },
    
    findUnique: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const user = db.users.find((item: any) => {
        // Check both flat structure and nested data structure
        const itemValue = item[key] || (item.data && item.data[key]);
        return itemValue === where[key];
      });
      
      if (!user) return null;
      
      // Flatten nested data structure if present
      if (user.data) {
        return {
          ...user.data,
          id: user.id,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };
      }
      
      return user;
    },
    
    create: (data: any) => {
      // Extract data from { data: {...} } format if needed
      const userData = data.data || data;
      
      // Ensure all required fields are present
      const username = (userData.username || '').trim();
      const password = userData.password || '';
      const role = userData.role || 'user';
      const isActive = userData.isActive !== undefined ? userData.isActive : true;
      
      // Validate required fields
      if (!username) {
        throw new Error('Username is required');
      }
      if (!password) {
        throw new Error('Password is required');
      }
      
      const newItem = {
        id: generateId(),
        username: username,
        password: password, // This should be the hashed password
        role: role,
        isActive: isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Reload database first to ensure we have latest data
      db = loadDatabase();
      
      if (!db.users) {
        db.users = [];
      }
      
      // Filter out any invalid users (null usernames)
      db.users = db.users.filter((u: any) => u && u.username && u.username.trim());
      
      // Check for duplicate username
      const existingUser = db.users.find((u: any) => u.username && u.username.trim().toLowerCase() === newItem.username.trim().toLowerCase())
      if (existingUser) {
        throw new Error('Username already exists')
      }
      
      db.users.push(newItem);
      
      // Save immediately and verify
      try {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        // Verify write immediately
        const verifyData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        const validUsers = (verifyData.users || []).filter((u: any) => u && u.username && u.username.trim());
        console.log('✅ User saved to file. Total valid users in file:', validUsers.length);
        console.log('✅ User IDs in file:', validUsers.map((u: any) => ({ id: u.id, username: u.username, hasPassword: !!u.password })));
      } catch (error) {
        console.error('❌ Error saving user:', error);
        throw error;
      }
      
      console.log('✅ User created in database:', { id: newItem.id, username: newItem.username, hasPassword: !!newItem.password, passwordLength: newItem.password.length });
      console.log('✅ Total users after creation:', db.users.length);
      
      return newItem;
    },
    
    update: (options: { where: any; data: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.users.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        db.users[index] = {
          ...db.users[index],
          ...options.data,
          updatedAt: new Date().toISOString(),
        };
        saveDatabase();
        return db.users[index];
      }
      return null;
    },
    
    upsert: (options: { where: any; create: any; update: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.users.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        // Update
        db.users[index] = {
          ...db.users[index],
          ...options.update,
          updatedAt: new Date().toISOString(),
        };
        saveDatabase();
        return db.users[index];
      } else {
        // Create
        const newItem = {
          id: generateId(),
          ...options.create,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.users.push(newItem);
        saveDatabase();
        return newItem;
      }
    },
    
    delete: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.users.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        const deleted = db.users.splice(index, 1)[0];
        saveDatabase();
        return deleted;
      }
      return null;
    },
  };

  // Packing material methods
  packingMaterial = {
    findMany: (options?: any) => {
      let items = [...db.packing_materials];
      
      if (options?.where) {
        Object.keys(options.where).forEach(key => {
          if (options.where[key] !== undefined) {
            items = items.filter(item => item[key] === options.where[key]);
          }
        });
      }
      
      if (options?.orderBy) {
        const key = Object.keys(options.orderBy)[0];
        const order = options.orderBy[key] || 'asc';
        items.sort((a, b) => {
          if (order === 'desc') {
            return b[key] > a[key] ? 1 : -1;
          }
          return a[key] > b[key] ? 1 : -1;
        });
      }
      
      return items;
    },
    
    findUnique: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      return db.packing_materials.find(item => item[key] === where[key]) || null;
    },
    
    create: (data: any) => {
      const newItem = {
        id: generateId(),
        name: data.name || '',
        unit: data.unit || 'pieces',
        category: data.category || 'Other',
        currentStock: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.packing_materials.push(newItem);
      saveDatabase();
      return newItem;
    },
    
    update: (options: { where: any; data: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.packing_materials.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        db.packing_materials[index] = {
          ...db.packing_materials[index],
          ...options.data,
          updatedAt: new Date().toISOString(),
        };
        saveDatabase();
        return db.packing_materials[index];
      }
      return null;
    },
    
    delete: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.packing_materials.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        const deleted = db.packing_materials.splice(index, 1)[0];
        saveDatabase();
        return deleted;
      }
      return null;
    },
  };

  // Packing purchase methods
  packingPurchase = {
    findMany: (options?: any) => {
      let items = [...db.packing_purchases];
      
      if (options?.where) {
        Object.keys(options.where).forEach(key => {
          if (options.where[key] !== undefined) {
            items = items.filter(item => item[key] === options.where[key]);
          }
        });
      }
      
      if (options?.orderBy) {
        const key = Object.keys(options.orderBy)[0];
        const order = options.orderBy[key] || 'desc';
        items.sort((a, b) => {
          if (order === 'desc') {
            return b[key] > a[key] ? 1 : -1;
          }
          return a[key] > b[key] ? 1 : -1;
        });
      }
      
      return items;
    },
    
    findUnique: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      return db.packing_purchases.find(item => item[key] === where[key]) || null;
    },
    
    create: (data: any) => {
      const quantity = parseFloat(data.quantity) || 0;
      const newItem = {
        id: generateId(),
        packingMaterialId: data.packingMaterialId,
        quantity: quantity,
        unit: data.unit || 'pieces',
        unitPrice: parseFloat(data.unitPrice) || 0,
        totalCost: parseFloat(data.totalCost) || 0,
        purchaseDate: data.purchaseDate || new Date().toISOString(),
        remainingQty: quantity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      db.packing_purchases.push(newItem);
      
      // Update packing material stock
      const material = db.packing_materials.find(m => m.id === data.packingMaterialId);
      if (material) {
        material.currentStock = (material.currentStock || 0) + quantity;
        material.updatedAt = new Date().toISOString();
      }
      
      saveDatabase();
      return newItem;
    },
    
    update: (options: { where: any; data: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.packing_purchases.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        const oldItem = db.packing_purchases[index];
        db.packing_purchases[index] = {
          ...db.packing_purchases[index],
          ...options.data,
          updatedAt: new Date().toISOString(),
        };
        
        // Update stock if quantity changed
        if (options.data.quantity !== undefined) {
          const material = db.packing_materials.find(m => m.id === oldItem.packingMaterialId);
          if (material) {
            const qtyDiff = parseFloat(options.data.quantity) - (oldItem.quantity || 0);
            material.currentStock = (material.currentStock || 0) + qtyDiff;
            material.updatedAt = new Date().toISOString();
          }
        }
        
        saveDatabase();
        return db.packing_purchases[index];
      }
      return null;
    },
    
    delete: (options: { where: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.packing_purchases.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        const deleted = db.packing_purchases.splice(index, 1)[0];
        
        // Update packing material stock
        const material = db.packing_materials.find(m => m.id === deleted.packingMaterialId);
        if (material) {
          material.currentStock = Math.max(0, (material.currentStock || 0) - (deleted.quantity || 0));
          material.updatedAt = new Date().toISOString();
        }
        
        saveDatabase();
        return deleted;
      }
      return null;
    },
  };

  // Shop settings methods
  shopSettings = {
    findMany: () => {
      return [...db.shop_settings];
    },
    
    findFirst: () => {
      return db.shop_settings[0] || null;
    },
    
    create: (data: any) => {
      const newItem = {
        id: generateId(),
        ...data,
        updatedAt: new Date().toISOString(),
      };
      db.shop_settings.push(newItem);
      saveDatabase();
      return newItem;
    },
    
    update: (options: { where: any; data: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.shop_settings.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        db.shop_settings[index] = {
          ...db.shop_settings[index],
          ...options.data,
          updatedAt: new Date().toISOString(),
        };
        saveDatabase();
        return db.shop_settings[index];
      }
      return null;
    },
    
    upsert: (options: { where: any; create: any; update: any }) => {
      const where = options.where;
      const key = Object.keys(where)[0];
      const index = db.shop_settings.findIndex(item => item[key] === where[key]);
      if (index !== -1) {
        // Update
        db.shop_settings[index] = {
          ...db.shop_settings[index],
          ...options.update,
          updatedAt: new Date().toISOString(),
        };
        saveDatabase();
        return db.shop_settings[index];
      } else {
        // Create
        const newItem = {
          id: generateId(),
          ...options.create,
          updatedAt: new Date().toISOString(),
        };
        db.shop_settings.push(newItem);
        saveDatabase();
        return newItem;
      }
    },
  };

  // Deleted Items
  deletedItem = {
    findMany: (options?: any) => {
      // Reload database to get fresh data
      db = loadDatabase();
      let items = [...db.deleted_items];
      if (options?.where) {
        Object.keys(options.where).forEach((key) => {
          items = items.filter((item: any) => item[key] === options.where[key]);
        });
      }
      if (options?.orderBy) {
        const [field, order] = Object.entries(options.orderBy)[0];
        items.sort((a: any, b: any) => {
          if (order === 'desc') {
            return a[field] > b[field] ? -1 : 1;
          }
          return a[field] > b[field] ? 1 : -1;
        });
      }
      return items;
    },
    findUnique: (options: any) => {
      // Reload database to get fresh data
      db = loadDatabase();
      return db.deleted_items.find((item: any) => item.id === options.where.id);
    },
    create: (options: any) => {
      // Reload database first to ensure we have latest data
      db = loadDatabase();
      if (!db.deleted_items) {
        db.deleted_items = [];
      }
      const newItem = {
        id: generateId(),
        ...options.data,
        deletedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.deleted_items.push(newItem);
      // Save immediately
      try {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        // Verify write immediately
        const verifyData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        console.log('✅ Deleted item saved:', newItem.id, 'Category:', newItem.category, 'Total in file:', verifyData.deleted_items?.length || 0);
      } catch (error) {
        console.error('❌ Error saving deleted item:', error);
      }
      return newItem;
    },
    delete: (options: any) => {
      // Reload database first
      db = loadDatabase();
      const index = db.deleted_items.findIndex((item: any) => item.id === options.where.id);
      if (index !== -1) {
        db.deleted_items.splice(index, 1);
        saveDatabase();
        return { id: options.where.id };
      }
      return null;
    },
    deleteMany: (options?: any) => {
      // Reload database first
      db = loadDatabase();
      if (!options || !options.where) {
        db.deleted_items = [];
      } else {
        Object.keys(options.where).forEach((key) => {
          db.deleted_items = db.deleted_items.filter(
            (item: any) => item[key] !== options.where[key]
          );
        });
      }
      saveDatabase();
      return { count: db.deleted_items.length };
    },
  };

  // Transaction support (simple implementation)
  $transaction = async (callback: (tx: any) => Promise<any>) => {
    // For JSON file, we just execute synchronously
    return await callback(this);
  };
}

// Create singleton instance
const globalForDb = globalThis as unknown as {
  db: DatabaseClient | undefined;
};

export const prisma = globalForDb.db ?? new DatabaseClient();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = prisma;
}

// Initialize database on import
initDatabase();

export default prisma;

