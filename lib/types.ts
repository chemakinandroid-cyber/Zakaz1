export type BranchId = 'airport' | 'konechnaya';

export type CategoryId =
  | 'shawarma'
  | 'burgers'
  | 'hotdogs'
  | 'quesadilla'
  | 'fryer'
  | 'sauces'
  | 'drinks'
  | 'coffee'
  | 'desserts';

export type ProductOption = {
  id: string;
  name: string;
  price: number;
};

export type Product = {
  id: string;
  category: CategoryId;
  name: string;
  description: string;
  price: number;
  image?: string;
  tags?: string[];
  comingSoon?: boolean;
  branchAvailability?: BranchId[];
  options?: ProductOption[];
};

export type StopListState = Record<BranchId, string[]>;

export type CartItem = {
  uid: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  branch: BranchId;
  optionId?: string;
  optionName?: string;
};

export type OrderStatus = 'new' | 'accepted' | 'cooking' | 'ready' | 'completed' | 'cancelled';

export type CustomerOrder = {
  id: string;
  createdAt: string;
  customerName: string;
  phone?: string;
  branch: BranchId;
  items: CartItem[];
  total: number;
  status: OrderStatus;
};
