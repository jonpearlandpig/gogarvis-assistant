
import { Tool } from 'openclaw/types'; // Adjust as needed
import { connectDb, closeDb } from './mongo';
import { ObjectId } from 'mongodb';

// --- RBAC/Permission Handler ---
async function checkPermissionHandler({ action, target, userId }: { action: string; target: string; userId?: string }) {
  const db = await connectDb();
  let allowed = false;
  let reason = 'Unknown';
  let requiredRole = 'Viewer';
  if (!userId) {
    reason = 'No userId provided';
    return { allowed, reason, requiredRole };
  }
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  if (!user) {
    reason = 'User not found';
    return { allowed, reason, requiredRole };
  }
  const role = user.role || 'Viewer';
  // Example: flexible RBAC logic
  if (role === 'Admin') {
    allowed = true;
    reason = 'Admin access';
    requiredRole = 'Admin';
  } else if (role === 'Editor' && action !== 'delete') {
    allowed = true;
    reason = 'Editor access';
    requiredRole = 'Editor';
  } else if (role === 'Viewer' && action === 'read') {
    allowed = true;
    reason = 'Viewer can read';
    requiredRole = 'Viewer';
  } else {
    reason = 'Insufficient permissions';
    requiredRole = 'Admin';
  }
  return { allowed, reason, requiredRole };
}

// --- Audit Logging Handler ---
async function logAuditHandler({ actionType, details, performedBy, outcome }: { actionType: string; details: object; performedBy: string; outcome: string }) {
  const db = await connectDb();
  const result = await db.collection('audit_log').insertOne({
    actionType,
    details,
    performedBy,
    outcome,
    timestamp: new Date().toISOString(),
  });
  return { logId: result.insertedId.toString(), timestamp: new Date().toISOString() };
}

// --- Governed Document Creation Handler ---
async function createGovernedDocumentHandler({ title, content, category, createdBy }: { title: string; content: string; category: string; createdBy: string }) {
  const db = await connectDb();
  const version = 1;
  const result = await db.collection('governed_documents').insertOne({
    title,
    content,
    category,
    version,
    createdBy,
    createdAt: new Date().toISOString(),
    approved: false,
  });
  return { docId: result.insertedId.toString(), version };
}

export const tools: Tool[] = [
  {
    name: 'checkPermission',
    description: 'Check if action is allowed under current role/authority',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Description of the action' },
        target: { type: 'string', description: 'Resource/file/etc' },
        userId: { type: 'string', description: 'User ID (MongoDB _id)' },
      },
      required: ['action', 'userId']
    },
    handler: checkPermissionHandler
  },
  {
    name: 'logAudit',
    description: 'Record an action in the immutable audit trail',
    parameters: {
      type: 'object',
      properties: {
        actionType: { type: 'string', description: 'Type of action performed' },
        details: { type: 'object', description: 'Details of the action' },
        performedBy: { type: 'string', description: 'User ID or agent' },
        outcome: { type: 'string', description: 'Result of the action' },
      },
      required: ['actionType', 'details', 'performedBy', 'outcome']
    },
    handler: logAuditHandler
  },
  {
    name: 'createGovernedDocument',
    description: 'Add a new document to governed storage with version and approval',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Document title' },
        content: { type: 'string', description: 'Document content' },
        category: { type: 'string', description: 'Document category' },
        createdBy: { type: 'string', description: 'User ID or agent' },
      },
      required: ['title', 'content', 'category', 'createdBy']
    },
    handler: createGovernedDocumentHandler
  },
];

export default {
  tools,
  // Optional: onLoad, onUnload hooks for resource management
  async onUnload() {
    await closeDb();
  }
};
