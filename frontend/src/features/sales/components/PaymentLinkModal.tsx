import React, { useState } from 'react';
import { X, Link2, Copy, Check, Calendar, HelpCircle } from 'lucide-react';
import { ZohoModal } from '@/shared/components/zoho/ZohoModal';
import notification from '@/core/services/NotificationService';

export interface PaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
  defaultAmount?: number;
  invoiceNo?: string;
}

export const PaymentLinkModal: React.FC<PaymentLinkModalProps> = ({
  isOpen,
  onClose,
  customerName = '',
  defaultAmount = 0,
  invoiceNo = '',
}) => {
  const [customer, setCustomer] = useState(customerName);
  const [amount, setAmount] = useState<number | ''>(defaultAmount || '');
  const [tax, setTax] = useState<number>(0);
  const [expirationDate, setExpirationDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [description, setDescription] = useState(
    invoiceNo ? `Payment for Invoice ${invoiceNo}` : ''
  );
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = () => {
    if (!amount || Number(amount) <= 0) {
      notification.error('Please enter a valid payment amount');
      return;
    }
    const token = Math.random().toString(36).substring(2, 10);
    const mockUrl = `${window.location.origin}/pay/${token}`;
    setGeneratedLink(mockUrl);
    notification.success('Payment link generated successfully!');
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      notification.success('Link copied to clipboard');
    }
  };

  const handleShare = () => {
    if (!generatedLink) handleGenerateLink();
    handleCopy();
    notification.info('Payment link ready to share with customer via Email or SMS');
    onClose();
  };

  return (
    <ZohoModal
      isOpen={isOpen}
      onClose={onClose}
      title="New Payment Link"
      maxWidth="max-w-lg"
    >
      <div className="p-6 space-y-4 text-xs text-[#2B2F36]">
        {/* Customer Name */}
        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
            Customer Name <span className="text-[#E54B4B]">*</span>
          </label>
          <input
            type="text"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Select or enter customer name"
            className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
        </div>

        {/* Amount & Tax in 2 cols */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
              Payment Amount (₹) <span className="text-[#E54B4B]">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
              Tax (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={tax || ''}
              onChange={(e) => setTax(Number(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
            />
          </div>
        </div>

        {/* Link Expiration Date */}
        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5 flex items-center justify-between">
            <span>
              Link Expiration Date <span className="text-[#E54B4B]">*</span>
            </span>
            <span className="text-[11px] text-[#6B7280] font-normal">
              Customer cannot pay after this date
            </span>
          </label>
          <input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="w-full h-8 px-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-[#2B2F36] mb-1.5">
            Description <span className="text-[#E54B4B]">*</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell your customer why you're collecting this payment…"
            className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-[4px] text-xs text-[#2B2F36] outline-none focus:border-[#408DFB]"
          />
        </div>

        {/* Generated Link Display */}
        {generatedLink && (
          <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1] rounded-[4px] space-y-1.5">
            <span className="text-[11px] font-semibold text-[#2B2F36]">Payment URL</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 h-7 px-2 bg-white border border-[#E5E7EB] rounded-[4px] text-xs font-mono text-[#408DFB] select-all outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 h-7 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] rounded-[4px] text-xs font-medium text-[#2B2F36] flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-[#6B7280]" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] text-[#2B2F36] rounded-[4px] text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateLink}
              className="px-4 py-1.5 bg-[#408DFB] hover:bg-[#3078E0] text-white rounded-[4px] text-xs font-medium cursor-pointer shadow-2xs"
            >
              Generate Link
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="px-4 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] text-[#2B2F36] rounded-[4px] text-xs font-medium cursor-pointer"
            >
              Save and Share
            </button>
          </div>
        </div>
      </div>
    </ZohoModal>
  );
};
