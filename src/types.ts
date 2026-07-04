export type DocumentType = 'markdown' | 'text' | 'json' | 'pdf' | 'spreadsheet' | 'image';

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  title: string;
  content: string;
  type: DocumentType;
  tags: string[];
  updatedAt: string;
  changeSummary: string;
  size: number;
  parentId?: string | null;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  type: DocumentType;
  size: number; // in bytes
  category: string; // matches shelf.id
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isArchived: boolean;
  customPreviewColor?: string;
  versions?: DocumentVersion[];
}

export interface Shelf {
  id: string;
  name: string;
  description: string;
  color: string; // hex or Tailwind color class
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  documentId: string;
  documentTitle: string;
  action: 'create' | 'edit' | 'delete' | 'archive' | 'restore' | 'favorite' | 'download' | 'upload';
  timestamp: string;
}

export interface DashboardStatsData {
  totalCount: number;
  totalSize: number; // in bytes
  typeCounts: Record<DocumentType, number>;
  shelfCounts: Record<string, number>;
  favoriteCount: number;
  archivedCount: number;
}
