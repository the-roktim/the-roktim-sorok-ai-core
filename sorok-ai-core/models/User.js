import mongoose from "mongoose";
import crypto from "crypto";

// Password helper using standard crypto
export function hashPassword(password) {
  const salt = "sorok_ai_core_salt";
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function comparePassword(inputPassword, storedHash) {
  return hashPassword(inputPassword) === storedHash;
}

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      default: "SOROK AI Operator",
    },
    role: {
      type: String,
      enum: ["admin", "executive", "operator", "auditor", "agent"],
      default: "operator",
    },
    tenantId: {
      type: String,
      default: "PCPOS",
    },
    vertical: {
      type: String,
      enum: ["SOROK-CORE", "PCPOS", "AgriOS", "TextileOS"],
      default: "SOROK-CORE",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "restricted"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose Model (compiled only once)
export const UserModel = mongoose.models.User || mongoose.model("User", userSchema);

// In-Memory store for development / standalone / mock mode
const inMemoryUsers = new Map();

// Seed default users for instant out-of-the-box demonstration
const defaultAdmin = {
  id: "usr_admin_001",
  _id: "usr_admin_001",
  username: "admin",
  email: "admin@sorok.ai",
  password: hashPassword("admin123"),
  fullName: "SOROK Chief Governance Officer",
  role: "admin",
  tenantId: "SOROK-CORPORATE",
  vertical: "SOROK-CORE",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const defaultOperator = {
  id: "usr_operator_001",
  _id: "usr_operator_001",
  username: "operator",
  email: "operator@pcpos.bd",
  password: hashPassword("operator123"),
  fullName: "PCPOS Lead Operations Manager",
  role: "operator",
  tenantId: "PCPOS",
  vertical: "PCPOS",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

inMemoryUsers.set(defaultAdmin.username, defaultAdmin);
inMemoryUsers.set(defaultOperator.username, defaultOperator);

export const UserStore = {
  async findOne({ username, email }) {
    if (mongoose.connection.readyState === 1) {
      try {
        const query = {};
        if (username) query.username = username.toLowerCase();
        if (email) query.email = email.toLowerCase();
        return await UserModel.findOne(query);
      } catch {
        // Fallback to in-memory if DB fails
      }
    }
    
    // In-Memory Lookup
    for (const user of inMemoryUsers.values()) {
      if (username && user.username === username.toLowerCase()) return user;
      if (email && user.email === email.toLowerCase()) return user;
    }
    return null;
  },

  async findById(id) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await UserModel.findById(id);
      } catch {
        // Fallback
      }
    }
    return inMemoryUsers.get(id) || Array.from(inMemoryUsers.values()).find(u => u.id === id || u._id === id) || null;
  },

  async create(userData) {
    const hashedPassword = hashPassword(userData.password);
    const preparedData = {
      ...userData,
      username: userData.username.toLowerCase(),
      email: userData.email.toLowerCase(),
      password: hashedPassword,
    };

    if (mongoose.connection.readyState === 1) {
      try {
        const created = await UserModel.create(preparedData);
        return created;
      } catch (err) {
        if (!err.message.includes('buffering timed out')) {
          throw err;
        }
      }
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userDoc = {
      id,
      _id: id,
      ...preparedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    inMemoryUsers.set(userDoc.username, userDoc);
    return userDoc;
  },

  async getAll() {
    if (mongoose.connection.readyState === 1) {
      try {
        return await UserModel.find().select("-password");
      } catch {
        // Fallback
      }
    }
    return Array.from(inMemoryUsers.values()).map(({ password, ...u }) => u);
  }
};
