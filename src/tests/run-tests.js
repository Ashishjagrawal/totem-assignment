#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Running Memory Warehouse Comprehensive Test Suite...\n');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL?.replace('memory_warehouse', 'memory_warehouse_test') || 'postgresql://postgres:postgres@localhost:5432/memory_warehouse_test?schema=public';

// Test configuration
const testSuites = [
  {
    name: 'Unit Tests',
    pattern: 'src/tests/unit/**/*.test.js',
    description: 'Testing individual service functions'
  },
  {
    name: 'Integration Tests',
    pattern: 'src/tests/integration/**/*.test.js',
    description: 'Testing API endpoints and database interactions'
  }
];

async function runTestSuite(suite) {
  console.log(`📋 Running ${suite.name}...`);
  console.log(`   ${suite.description}`);
  
  try {
    execSync(`npx jest "${suite.pattern}" --verbose --coverage --collectCoverageFrom=src/**/*.js --coverageDirectory=coverage --coverageReporters=text,lcov,html,json`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..'),
    });
    console.log(`✅ ${suite.name} passed!\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${suite.name} failed:`, error.message);
    return false;
  }
}

async function runAllTests() {
  let allPassed = true;
  
  for (const suite of testSuites) {
    const passed = await runTestSuite(suite);
    if (!passed) {
      allPassed = false;
    }
  }
  
  if (allPassed) {
    console.log('🎉 All test suites passed successfully!');
    console.log('📊 Coverage report generated in ./coverage/');
    console.log('📈 View detailed coverage at ./coverage/lcov-report/index.html');
  } else {
    console.log('❌ Some test suites failed.');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});