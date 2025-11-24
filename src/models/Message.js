import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Expéditeur requis'],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Destinataire requis'],
    },
    content: {
      type: String,
      required: [true, 'Contenu requis'],
      maxlength: [5000, 'Maximum 5000 caractères'],
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, readAt: 1 });

messageSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (this.deleted) {
    obj.content = '[Message supprimé]';
  }
  return obj;
};

export default mongoose.model('Message', messageSchema);
