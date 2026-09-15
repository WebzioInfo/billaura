import { GSTEngine } from '../common/utils/gst-engine.util';

describe('Universal Document Engine & Tax Calculations', () => {
  describe('GSTEngine', () => {
    it('should calculate 18% Intra-State GST (9% CGST + 9% SGST) for same state', () => {
      const result = GSTEngine.calculate({
        taxableAmount: 10000,
        gstRate: 18,
        taxPreference: 'TAXABLE',
        companyStateCode: '27', // Maharashtra
        customerStateCode: '27', // Maharashtra
      });

      expect(result.taxableAmount).toBe(10000);
      expect(result.cgstAmount).toBe(900);
      expect(result.sgstAmount).toBe(900);
      expect(result.igstAmount).toBe(0);
      expect(result.totalTax).toBe(1800);
      expect(result.grandTotal).toBe(11800);
    });

    it('should calculate 18% Inter-State GST (18% IGST) for different states', () => {
      const result = GSTEngine.calculate({
        taxableAmount: 50000,
        gstRate: 18,
        taxPreference: 'TAXABLE',
        companyStateCode: '27', // Maharashtra
        customerStateCode: '29', // Karnataka
      });

      expect(result.taxableAmount).toBe(50000);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.igstAmount).toBe(9000);
      expect(result.totalTax).toBe(9000);
      expect(result.grandTotal).toBe(59000);
    });

    it('should return 0 tax for NOT_APPLICABLE (Course Fee Receipt)', () => {
      const result = GSTEngine.calculate({
        taxableAmount: 25000,
        gstRate: 18,
        taxPreference: 'NOT_APPLICABLE',
        companyStateCode: '27',
        customerStateCode: '27',
      });

      expect(result.taxableAmount).toBe(25000);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.igstAmount).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.grandTotal).toBe(25000);
      expect(result.taxPreference).toBe('NOT_APPLICABLE');
    });

    it('should return 0 tax for EXEMPT / NIL_RATED / ZERO_RATED / NON_GST', () => {
      const exempt = GSTEngine.calculate({
        taxableAmount: 1500,
        gstRate: 5,
        taxPreference: 'EXEMPT',
        companyStateCode: '27',
        customerStateCode: '27',
      });
      expect(exempt.totalTax).toBe(0);
      expect(exempt.grandTotal).toBe(1500);

      const zeroRated = GSTEngine.calculate({
        taxableAmount: 100000,
        gstRate: 18,
        taxPreference: 'ZERO_RATED',
        companyStateCode: '27',
        customerStateCode: 'OVERSEAS',
      });
      expect(zeroRated.totalTax).toBe(0);
      expect(zeroRated.grandTotal).toBe(100000);
    });

    it('should calculate cess when applicable', () => {
      const result = GSTEngine.calculate({
        taxableAmount: 100000,
        gstRate: 28,
        cessRate: 12,
        taxPreference: 'TAXABLE',
        companyStateCode: '27',
        customerStateCode: '27',
      });

      expect(result.cgstAmount).toBe(14000);
      expect(result.sgstAmount).toBe(14000);
      expect(result.cessAmount).toBe(12000);
      expect(result.totalTax).toBe(40000);
      expect(result.grandTotal).toBe(140000);
    });
  });
});
