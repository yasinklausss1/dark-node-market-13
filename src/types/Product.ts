export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory_id?: string | null;
  subcategory_name?: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  seller_id: string;
  stock: number;
  product_type?: string;
}

export interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  product_type: string;
  created_at: string;
  updated_at: string;
}