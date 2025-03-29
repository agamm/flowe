import { test, expect } from '@playwright/test';

test('should create a flow via API, navigate to it, and view metadata', async ({ page, request }) => {
  // Generate IDs for our test
  const flowId = `flow-${Date.now()}`;
  const processId = `process-${Date.now()}`;
  
  // Create a new flow by creating a process with the API
  // Using the request context directly for API requests
  const response = await request.post('/api/flow', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      id: processId,
      flowId: flowId,
      arguments: { name: 'Test Process' },
      status: 'completed',
      output: { result: 'Test data' }
    }
  });
  
  // Verify API response
  expect(response.ok()).toBeTruthy();
  const responseData = await response.json();
  console.log('API response:', responseData);
  
  // Navigate to the flow view
  await page.goto(`/flow/${flowId}`);
  
  // Take a screenshot to see what's displayed
  await page.screenshot({ path: '/tmp/flow-screen.png' });
  
  // Wait for the flow visualization to load
  await expect(page.locator('[data-testid="process-flow-container"]')).toBeVisible();
  
  // Verify at least one node is displayed
  const nodes = page.locator('[data-testid^="node-"]');
  await expect(nodes).toBeVisible();
  
  // Add a small delay before clicking to ensure all event handlers are attached
  await page.waitForTimeout(500);
  
  // Click firmly in the center of the node
  await nodes.first().click({ force: true, timeout: 3000 });
  
  // Find the input JSON view specifically by looking for content
  const inputView = page.locator('[data-testid="json-view-content"]')
    .filter({ hasText: 'Test Process' });
  await expect(inputView).toBeVisible();
  
  // Find the output JSON view by looking for result content
  const outputView = page.locator('[data-testid="json-view-content"]')
    .filter({ hasText: 'Test data' });
  await expect(outputView).toBeVisible();
  
  // Make sure at least one JSON view container exists
  const containers = page.locator('[data-testid="json-view-container"]');
  const count = await containers.count();
  expect(count).toBeGreaterThan(0);
}); 