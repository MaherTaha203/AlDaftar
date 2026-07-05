// Attachments module — generic archive: types, repository seam, service.

export {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_SIZE_BYTES,
  AttachmentOwnerTypes,
  formatFileSize,
  type Attachment,
  type AttachmentOwner,
} from './attachment';
export {
  AttachmentService,
  getAttachmentRepository,
  getAttachmentService,
  type AttachmentRepository,
} from './attachment-service';
