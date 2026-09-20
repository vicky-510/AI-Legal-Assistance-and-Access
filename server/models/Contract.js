import mongoose from 'mongoose';

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'NOT_SPECIFIED_IN_DOCUMENT'];

const clauseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    plainEnglishSummary: { type: String, required: true },
    riskLevel: { type: String, enum: RISK_LEVELS, required: true },
    riskReason: { type: String, default: '' },
    verbatimQuote: { type: String, required: true },
    pageNumber: { type: Number, default: null },
  },
  { _id: false }
);

const chunkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    pageNumber: { type: Number, default: null },
    chunkIndex: { type: Number, required: true },
    embedding: { type: [Number], default: undefined, select: false },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    citations: {
      type: [
        {
          pageNumber: Number,
          quote: String,
        },
      ],
      default: [],
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const contractSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    documentHash: { type: String, required: true, index: true },
    pageCount: { type: Number, default: 0 },
    fullText: { type: String, required: true, select: false },
    executiveSummary: { type: [String], default: [] },
    overallRiskScore: { type: String, enum: RISK_LEVELS, default: 'LOW' },
    clauses: { type: [clauseSchema], default: [] },
    chunks: { type: [chunkSchema], default: [], select: false },
    chatHistory: { type: [chatMessageSchema], default: [] },
  },
  { timestamps: true }
);

contractSchema.index({ owner: 1, documentHash: 1 });

export const RISK_LEVEL_VALUES = RISK_LEVELS;
export default mongoose.model('Contract', contractSchema);
