-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL DEFAULT 'physical',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, category_id)
);

-- Add subcategory_id to products table
ALTER TABLE public.products ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subcategories
CREATE POLICY "Anyone can view subcategories" 
ON public.subcategories 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage subcategories" 
ON public.subcategories 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create trigger for updated_at
CREATE TRIGGER update_subcategories_updated_at
BEFORE UPDATE ON public.subcategories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();