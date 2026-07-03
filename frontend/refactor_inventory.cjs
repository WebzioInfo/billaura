const fs = require('fs');

let content = fs.readFileSync('src/features/inventory/InventoryDashboard.tsx', 'utf8');

if (!content.includes('useApiList')) {
  content = content.replace(
    /import \{ useQueryClient \} from '@tanstack\/react-query';/,
    "import { useQueryClient } from '@tanstack/react-query';\nimport { useApiList } from '../../hooks/useApiList';"
  );
}

content = content.replace(
  /const \[products, setProducts\] = useState<Product\[\]>\(\[\]\);/,
  "const { data: products = [], isLoading: isLoadingProducts } = useApiList<Product>(['products'], '/products');"
);
content = content.replace(
  /const \[stocks, setStocks\] = useState<Stock\[\]>\(\[\]\);/,
  "const { data: stocks = [], isLoading: isLoadingStocks } = useApiList<Stock>(['stocks'], '/inventory/stocks');"
);
content = content.replace(
  /const \[warehouses, setWarehouses\] = useState<Warehouse\[\]>\(\[\]\);/,
  "const { data: warehouses = [], isLoading: isLoadingWarehouses } = useApiList<Warehouse>(['warehouses'], '/warehouses');"
);
content = content.replace(
  /const \[categories, setCategories\] = useState<Category\[\]>\(\[\]\);/,
  "const { data: categories = [], isLoading: isLoadingCategories } = useApiList<Category>(['categories'], '/inventory/categories');"
);
content = content.replace(
  /const \[brands, setBrands\] = useState<Brand\[\]>\(\[\]\);/,
  "const { data: brands = [], isLoading: isLoadingBrands } = useApiList<Brand>(['brands'], '/inventory/brands');"
);

// Remove fetchData and useEffect
content = content.replace(/const fetchData = async \(\) => \{[\s\S]*?setIsLoading\(false\);\n    \}\n  \};\n\n  useEffect\(\(\) => \{[\s\S]*?\}, \[activeTab\]\);/m, '');

// Replace isLoading definition
content = content.replace(/const \[isLoading, setIsLoading\] = useState\(true\);/, 'const isLoading = isLoadingProducts || isLoadingStocks || isLoadingWarehouses || isLoadingCategories || isLoadingBrands;');

// Replace fetchData() calls
content = content.replace(/fetchData\(\);/g, "queryClient.invalidateQueries({ queryKey: [activeTab] });");

fs.writeFileSync('src/features/inventory/InventoryDashboard.tsx', content);
console.log('Refactored InventoryDashboard.tsx');
