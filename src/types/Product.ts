export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  seller_id: string;
  stock: number;
}