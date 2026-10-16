import React from 'react';
import { ProductForm, ProductFormProps } from './ProductForm';

export interface ProductFormModalProps {
  isOpen?: boolean;
  initialData?: any;
  product?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen = true,
  initialData,
  product,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-150 select-none">
      <div className="w-full h-full max-w-5xl max-h-[92vh] bg-white rounded-[4px] border border-[#E5E7EB] shadow-2xl flex flex-col overflow-hidden m-4">
        <ProductForm
          initialData={initialData || product}
          productId={(initialData || product)?.id}
          isModal={true}
          onClose={onClose}
          onSuccess={() => {
            onSuccess();
            onClose();
          }}
        />
      </div>
    </div>
  );
};

export default ProductFormModal;
