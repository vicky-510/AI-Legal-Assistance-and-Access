import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema(
  {
    clauseTitle: { type: String, required: true },
    changeType: { type: String, enum: ['ADDED', 'REMOVED', 'MODIFIED', 'UNCHANGED'], required: true },
    riskImpact: { type: String, enum: ['HIGHER_RISK', 'LOWER_RISK', 'NEUTRAL'], required: true },
    explanation: { type: String, required: true },
    verbatimQuoteA: { type: String, default: '' },
    verbatimQuoteB: { type: String, default: '' },
  },
  { _id: false }
);

const chunkSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['A', 'B'], required: true },
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
          source: String,
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

const comparisonSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    comparisonHash: { type: String, required: true, index: true },
    fileNameA: { type: String, required: true },
    fileNameB: { type: String, required: true },
    pageCountA: { type: Number, default: 0 },
    pageCountB: { type: Number, default: 0 },
    changes: { type: [changeSchema], default: [] },
    overallAssessment: { type: String, required: true },
    fullTextA: { type: String, default: '', select: false },
    fullTextB: { type: String, default: '', select: false },
    chunks: { type: [chunkSchema], default: [], select: false },
    chatHistory: { type: [chatMessageSchema], default: [] },
  },
  { timestamps: true }
);

comparisonSchema.index({ owner: 1, comparisonHash: 1 });

export default mongoose.model('Comparison', comparisonSchema);
