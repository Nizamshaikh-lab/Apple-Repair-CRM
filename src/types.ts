export interface InventoryItem {
  id: string;
  name: string;
  type: 'part' | 'tool';
  category: 'iPhone' | 'iPad' | 'iWatch' | 'MacBook' | 'General';
  quantity: number;
  price: number;
  updatedAt: string;
}

export interface Repair {
  id: string;
  trackingId: string;
  customerName: string;
  customerPhone: string;
  deviceModel: string;
  deviceType: 'iPhone' | 'iPad' | 'iWatch' | 'MacBook';
  status: 'pickdrop' | 'repair' | 'quotation' | 'completed' | 'delivered';
  quotationAmount?: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDraft {
  vision: string;
  location: string;
  roadmap: {
    phase: string;
    description: string;
  }[];
  funding: string;
  marketing: string;
}
