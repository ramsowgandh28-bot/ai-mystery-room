import mongoose from 'mongoose';

const { Schema } = mongoose;

const SuspectSchema = new Schema(
  {
    id:          { type: String, required: true },
    name:        { type: String, required: true },
    description: { type: String, required: true },
    alibi:       { type: String, required: true },
  },
  { _id: false }
);

const ClueSchema = new Schema(
  {
    id:           { type: String, required: true },
    text:         { type: String, required: true },
    discovered:   { type: Boolean, default: false },
    discoveredAt: { type: Date, default: null },
  },
  { _id: false }
);

const HintSchema = new Schema(
  {
    id:     { type: String, required: true },
    text:   { type: String, required: true },
    used:   { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
  },
  { _id: false }
);

const SolutionSchema = new Schema(
  {
    culpritId:   { type: String, required: true },
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const ScoreSchema = new Schema(
  {
    base:        { type: Number, default: 0 },
    clueBonus:   { type: Number, default: 0 },
    hintPenalty: { type: Number, default: 0 },
    provisional: { type: Number, default: 0 },
    final:       { type: Number, default: null },
  },
  { _id: false }
);

const CaseSchema = new Schema(
  {
    title:            { type: String, required: true },
    story:            { type: String, required: true },
    premise:          { type: String, required: true },
    difficulty:       { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    sessionTokenHash: { type: String, required: true, select: false },

    suspects: [SuspectSchema],
    clues:    [ClueSchema],
    hints:    [HintSchema],

    solution: { type: SolutionSchema, required: true },

    accusation: {
      suspectId:   { type: String, default: null },
      isCorrect:   { type: Boolean, default: null },
      submittedAt: { type: Date, default: null },
    },

    score: { type: ScoreSchema, default: () => ({}) },

    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },

    createdAt:      { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// TTL Index: expire after 24 hours (86400 seconds) of inactivity on lastActivityAt
CaseSchema.index({ lastActivityAt: 1 }, { expireAfterSeconds: 86400 });

export const Case = mongoose.model('Case', CaseSchema);
export default Case;
