const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'features', 'sales', 'ReceiptForm.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Add states
content = content.replace(
  "const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');",
  `const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<any[]>([{ paymentMethod: 'CASH', amount: 0, accountId: '', referenceNo: '' }]);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');`
);

// Add to payload
content = content.replace(
  "amount,",
  `amount,
        splitPayments: isSplitPayment ? splitPayments.map(sp => ({
          paymentMethod: sp.paymentMethod,
          amount: Number(sp.amount),
          accountId: sp.accountId || undefined,
          referenceNo: sp.referenceNo || undefined
        })) : undefined,`
);

// Add split payment UI
const splitPaymentUI = `
            {/* Split Payment Toggle */}
            <div className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <h4 className="text-sm font-bold text-foreground">Split Payment</h4>
                <p className="text-xs text-muted-foreground">Enable to pay using multiple payment methods</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isSplitPayment}
                  onChange={(e) => setIsSplitPayment(e.target.checked)}
                  disabled={isView}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>

            {isSplitPayment && (
              <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                 <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex justify-between items-center">
                  <span className="flex items-center gap-2">Payment Methods</span>
                  {!isView && (
                    <button type="button" onClick={() => setSplitPayments([...splitPayments, { paymentMethod: 'CASH', amount: 0, accountId: '', referenceNo: '' }])} className="text-xs text-accent hover:underline flex items-center gap-1">
                      Add Method
                    </button>
                  )}
                </h3>
                <div className="space-y-4">
                  {splitPayments.map((sp, idx) => (
                    <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end p-3 bg-muted/20 rounded-xl border border-border">
                      <div className="w-full md:w-1/4">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Method</label>
                        <select
                          value={sp.paymentMethod}
                          onChange={(e) => {
                            const newArr = [...splitPayments];
                            newArr[idx].paymentMethod = e.target.value;
                            setSplitPayments(newArr);
                          }}
                          disabled={isView}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent"
                        >
                          <option value="BANK_TRANSFER">Bank</option>
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="CREDIT_CARD">Card</option>
                        </select>
                      </div>
                      <div className="w-full md:w-1/4">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Amount</label>
                        <input
                          type="number"
                          value={sp.amount}
                          onChange={(e) => {
                            const newArr = [...splitPayments];
                            newArr[idx].amount = Number(e.target.value);
                            setSplitPayments(newArr);
                          }}
                          disabled={isView}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div className="w-full md:w-1/3">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Account / Ref</label>
                        <input
                          type="text"
                          placeholder="Account or Ref"
                          value={sp.referenceNo || sp.accountId}
                          onChange={(e) => {
                            const newArr = [...splitPayments];
                            if (sp.paymentMethod === 'BANK_TRANSFER' || sp.paymentMethod === 'UPI') {
                               newArr[idx].accountId = e.target.value;
                            } else {
                               newArr[idx].referenceNo = e.target.value;
                            }
                            setSplitPayments(newArr);
                          }}
                          disabled={isView}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      {!isView && splitPayments.length > 1 && (
                        <button type="button" onClick={() => {
                          const newArr = splitPayments.filter((_, i) => i !== idx);
                          setSplitPayments(newArr);
                        }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {splitPayments.reduce((s, a) => s + Number(a.amount), 0) !== amount && amount > 0 && (
                    <div className="text-xs font-bold text-red-500 bg-red-50 p-2 rounded-lg flex items-center gap-2">
                      Split amounts sum ({splitPayments.reduce((s, a) => s + Number(a.amount), 0)}) must equal Receipt Amount ({amount})
                    </div>
                  )}
                </div>
              </div>
            )}
`;

// Hide standard UI if split
content = content.replace(
  '{/* Card 1 - Receipt Details */}',
  splitPaymentUI + '\n            {!isSplitPayment && (\n              <>\n              {/* Card 1 - Receipt Details */}'
);

// Close the !isSplitPayment block right after Receipt Details Card
content = content.replace(
  '{/* Card 2 - Payment Tracking */}',
  '            </>\n            )}\n\n            {!isSplitPayment && (\n            <>\n            {/* Card 2 - Payment Tracking */}'
);

// Close the !isSplitPayment block right before Attachments
content = content.replace(
  '{/* Card 3 - Attachments */}',
  '            </>\n            )}\n\n            {/* Card 3 - Attachments */}'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Patched ReceiptForm.tsx successfully.');
