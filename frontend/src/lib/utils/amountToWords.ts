export function convertAmountToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  
  const single = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const formatTenth = (digit: number, prev: number) => {
    return (0 === digit) ? '' : ' ' + (digit === 1 ? single[prev + 10] : tens[digit] + (prev !== 0 ? '-' + single[prev] : ''));
  };
  
  const amountStr = amount.toFixed(2).toString();
  const [rupeesStr, paiseStr] = amountStr.split('.');
  let rupees = parseInt(rupeesStr, 10);
  const paise = parseInt(paiseStr, 10);
  
  if (rupees === 0) {
    if (paise === 0) return 'Zero Rupees Only';
    return `${paise} Paise Only`;
  }
  
  let word = '';
  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  const hundred = Math.floor(rupees / 100);
  rupees %= 100;
  
  if (crore > 0) {
    word += (crore < 20 ? single[crore] : formatTenth(Math.floor(crore / 10), crore % 10)) + ' Crore ';
  }
  if (lakh > 0) {
    word += (lakh < 20 ? single[lakh] : formatTenth(Math.floor(lakh / 10), lakh % 10)) + ' Lakh ';
  }
  if (thousand > 0) {
    word += (thousand < 20 ? single[thousand] : formatTenth(Math.floor(thousand / 10), thousand % 10)) + ' Thousand ';
  }
  if (hundred > 0) {
    word += single[hundred] + ' Hundred ';
  }
  if (rupees > 0) {
    word += (word === '' ? '' : 'and ') + (rupees < 20 ? single[rupees] : formatTenth(Math.floor(rupees / 10), rupees % 10));
  }
  
  word = word.trim() + ' Rupees';
  
  if (paise > 0) {
    word += ' and ' + (paise < 20 ? single[paise] : formatTenth(Math.floor(paise / 10), paise % 10)).trim() + ' Paise';
  }
  
  return word + ' Only';
}
