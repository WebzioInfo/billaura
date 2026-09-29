import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Plus, Trash2, IndianRupee, CheckCircle2, Download, FileText } from 'lucide-react';
import apiClient from '@/core/api';
import { Button } from '@/shared/components/ui/Button';
import notification from '@/core/services/NotificationService';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
}

type PaymentSplit = {
  id: string;
  paymentMethod: string;
  amount: number;
  accountId: string;
  referenceNo: string;
};

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, invoice, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [createdReceipt, setCreatedReceipt] = useState<any | null>(null);

  const [splits, setSplits] = useState<PaymentSplit[]>([{
    id: Date.now().toString(),
    paymentMethod: 'BANK_TRANSFER',
    amount: invoice ? Number(invoice.outstandingAmount) || (Number(invoice.grandTotal) - Number(invoice.amountPaid)) : 0,
    accountId: '',
    referenceNo: '',
  }]);

  // Fetch Bank Accounts for dropdown
  const { data: accounts } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/finance/bank/accounts');
      return (res as any).data || res;
    }
  });

  if (!isOpen || !invoice) return null;

  const outstanding = Number(invoice.outstandingAmount) || Math.max(0, Number(invoice.grandTotal) - Number(invoice.amountPaid));
  const totalPayment = splits.reduce((sum, split) => sum + Number(split.amount || 0), 0);

  const handleAddSplit = () => {
    const remaining = Math.max(0, outstanding - totalPayment);
    setSplits([...splits, {
      id: Date.now().toString(),
      paymentMethod: 'CASH',
      amount: remaining > 0 ? remaining : 0,
      accountId: '',
      referenceNo: '',
    }]);
  };

  const handleRemoveSplit = (id: string) => {
    setSplits(splits.filter(s => s.id !== id));
  };

  const handleUpdateSplit = (id: string, field: keyof PaymentSplit, value: any) => {
    setSplits(splits.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleCloseModal = () => {
    setCreatedReceipt(null);
    onClose();
  };

  const handleDownloadPdf = async (receiptId: string, receiptNo: string) => {
    try {
      notification.info('Preparing receipt PDF download...');
      const response = await apiClient.get(`/receipts/${receiptId}/pdf`, { responseType: 'blob' });
      const blob = response instanceof Blob ? response : new Blob([(response as any).data || response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${receiptNo || 'Receipt'}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      notification.success('Receipt PDF downloaded successfully');
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to download receipt PDF');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPayment <= 0) {
      notification.error('Payment amount must be greater than 0.');
      return;
    }
    if (totalPayment > outstanding + 0.01) {
      notification.error(`Payment amount ₹${totalPayment.toFixed(2)} exceeds remaining balance of ₹${outstanding.toFixed(2)}.`);
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.post('/sales/receipts', {
        date,
        businessPartnerId: invoice.businessPartnerId,
        amount: totalPayment,
        notes,
        allocations: [{ invoiceId: invoice.id, amount: totalPayment }],
        splitPayments: splits.map(s => ({
          paymentMethod: s.paymentMethod,
          amount: s.amount,
          accountId: s.accountId || undefined,
          referenceNo: s.referenceNo || undefined,
        }))
      });

      const receiptObj = res.data?.data || res.data;
      setCreatedReceipt(receiptObj);
      notification.success('Payment recorded successfully.');
      onSuccess();
    } catch (err: any) {
      notification.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {createdReceipt ? 'Payment Receipt Created' : 'Record Payment'}
            </h2>
            <p className="text-sm text-gray-500">Invoice {invoice.invoiceNo}</p>
          </div>
          <button onClick={handleCloseModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {createdReceipt ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Payment Recorded Successfully</h3>
              <p className="text-sm text-gray-500">
                Receipt <span className="font-bold text-blue-600 font-mono">{createdReceipt.receiptNo || 'REC-001'}</span> has been generated and credited to accounts receivable.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-w-md mx-auto grid grid-cols-2 gap-4 text-left text-sm">
              <div>
                <span className="text-gray-500 block text-xs font-medium">Amount Received</span>
                <span className="font-bold text-green-700 text-lg">₹ {Number(createdReceipt.amount || totalPayment).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs font-medium">Remaining Balance</span>
                <span className="font-bold text-gray-900 text-lg">₹ {Math.max(0, outstanding - totalPayment).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-4">
              <Button
                variant="primary"
                onClick={() => handleDownloadPdf(createdReceipt.id, createdReceipt.receiptNo)}
                className="flex items-center gap-2"
              >
                <Download size={16} /> Download Receipt PDF
              </Button>
              <Button variant="outline" onClick={handleCloseModal}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div>
                <p className="text-sm text-blue-600 font-medium">Outstanding Balance</p>
                <p className="text-2xl font-bold text-blue-900">₹ {outstanding.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600 font-medium">Total Paying</p>
                <p className={`text-2xl font-bold ${totalPayment > outstanding ? 'text-red-600' : 'text-blue-900'}`}>
                  ₹ {totalPayment.toFixed(2)}
                </p>
              </div>
            </div>

            {totalPayment > outstanding && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-semibold border border-red-200">
                Payment amount ₹{totalPayment.toFixed(2)} exceeds the remaining balance of ₹{outstanding.toFixed(2)}.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Internal Remarks</label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Payment Modes (Splits)</label>
                <button
                  type="button"
                  onClick={handleAddSplit}
                  className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Plus size={14} /> Add Mode
                </button>
              </div>

              {splits.map((split) => (
                <div key={split.id} className="grid grid-cols-12 gap-3 items-start bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">Method</label>
                    <select
                      value={split.paymentMethod}
                      onChange={e => handleUpdateSplit(split.id, 'paymentMethod', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  <div className="col-span-4">
                    <label className="block text-xs text-gray-500 mb-1">Account</label>
                    <select
                      value={split.accountId}
                      onChange={e => handleUpdateSplit(split.id, 'accountId', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">Auto Select Ledger</option>
                      {(accounts || []).map((acc: any) => (
                        <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-4">
                    <label className="block text-xs text-gray-500 mb-1">Amount</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <IndianRupee size={12} className="text-gray-400" />
                      </div>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={split.amount}
                        onChange={e => handleUpdateSplit(split.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full pl-6 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="col-span-1 pt-6 text-center">
                    {splits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSplit(split.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {(split.paymentMethod === 'CHEQUE' || split.paymentMethod === 'UPI' || split.paymentMethod === 'BANK_TRANSFER') && (
                    <div className="col-span-12 mt-2">
                      <input
                        type="text"
                        placeholder={split.paymentMethod === 'CHEQUE' ? "Cheque Number" : "Transaction Ref / UTR"}
                        value={split.referenceNo}
                        onChange={e => handleUpdateSplit(split.id, 'referenceNo', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 -mx-6 -mb-6 mt-6">
              <Button variant="outline" type="button" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" disabled={loading || totalPayment <= 0 || totalPayment > outstanding + 0.01}>
                {loading ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
