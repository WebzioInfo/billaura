import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class DocumentEngineService {
  private readonly logger = new Logger(DocumentEngineService.name);

  async generatePdf(html: string): Promise<Buffer> {
    this.logger.log('Generating PDF via Puppeteer...');
    
    // In a real enterprise app, we'd reuse the browser instance or use a pool.
    // For this implementation, we launch per request as a starting point.
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
      const page = await browser.newPage();
      
      // We set the content and wait for network idle to ensure fonts/images load
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      
      const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });
      
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
