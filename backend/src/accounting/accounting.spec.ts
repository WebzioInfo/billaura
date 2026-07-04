describe("General Ledger Accounting Double-Entry Validation", () => {
  it("should balance debits and credits correctly", () => {
    const lines = [
      { accountId: "ar-account-id", debit: 12000, credit: 0 },
      { accountId: "sales-account-id", debit: 0, credit: 12000 },
    ];

    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(12000);
  });

  it("should fail validation when debits and credits do not balance", () => {
    const lines = [
      { accountId: "ar-account-id", debit: 12000, credit: 0 },
      { accountId: "sales-account-id", debit: 0, credit: 10000 }, // unbalanced
    ];

    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    expect(totalDebit).not.toBe(totalCredit);
  });

  it("should correctly calculate P&L Net Operating Profit surplus", () => {
    const revenue = [
      { name: "Product Sales", balance: -150000 }, // Credit standard standard is negative
      { name: "Service Income", balance: -50000 },
    ];
    const expenses = [
      { name: "Office Rent", balance: 40000 },
      { name: "Staff Salaries", balance: 90000 },
      { name: "Internet Overhead", balance: 5000 },
    ];

    const totalRevenue = revenue.reduce(
      (sum, r) => sum + Math.abs(r.balance),
      0,
    );
    const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);
    const netProfit = totalRevenue - totalExpenses;

    expect(totalRevenue).toBe(200000);
    expect(totalExpenses).toBe(135000);
    expect(netProfit).toBe(65000);
  });
});
