import handler from './api/index';

async function test() {
  try {
    const req = { url: '/api/health', method: 'GET', headers: {} };
    const res = {
      statusCode: 200,
      setHeader: (name: string, value: string) => console.log(`Set header: ${name} = ${value}`),
      end: (data: any) => console.log(`End: ${data}`),
      write: (data: any) => console.log(`Write: ${data}`)
    };
    
    console.log('Invoking handler...');
    await handler(req as any, res as any);
    console.log('Handler invocation finished.');
  } catch (err) {
    console.error('Exception during invocation:', err);
  }
}

test();
