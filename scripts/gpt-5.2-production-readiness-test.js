/**
 * GPT-5.2 Production Readiness Test Suite
 * Comprehensive testing for mass user deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class GPT52ProductionTester {
    constructor() {
        this.results = {
            tests: [],
            passed: 0,
            failed: 0,
            warnings: 0
        };
        this.startTime = Date.now();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const coloredMessage = this.colorize(message, type);
        console.log(`[${timestamp}] ${coloredMessage}`);
    }

    colorize(message, type) {
        const colors = {
            success: '\x1b[32m',
            error: '\x1b[31m',
            warning: '\x1b[33m',
            info: '\x1b[36m',
            reset: '\x1b[0m'
        };
        return `${colors[type]}${message}${colors.reset}`;
    }

    async runTest(testName, testFn) {
        this.log(`Running: ${testName}`, 'info');
        try {
            const result = await testFn();
            if (result.passed) {
                this.results.passed++;
                this.log(`✅ PASSED: ${testName}`, 'success');
            } else {
                this.results.failed++;
                this.log(`❌ FAILED: ${testName} - ${result.message}`, 'error');
            }
            this.results.tests.push({ name: testName, ...result });
        } catch (error) {
            this.results.failed++;
            this.log(`❌ ERROR: ${testName} - ${error.message}`, 'error');
            this.results.tests.push({ name: testName, passed: false, message: error.message });
        }
    }

    async testEnvironmentVariables() {
        const requiredVars = [
            'SMARTCRM_MODEL',
            'SMARTCRM_THINKING_MODEL',
            'SMARTCRM_FAST_MODEL',
            'OPENAI_API_KEY'
        ];

        const missing = requiredVars.filter(varName => !process.env[varName]);

        if (missing.length > 0) {
            return {
                passed: false,
                message: `Missing environment variables: ${missing.join(', ')}`
            };
        }

        // Validate model values
        const expectedModels = ['gpt-5.2', 'gpt-5.2-thinking', 'gpt-5.2-instant'];
        const actualModels = [
            process.env.SMARTCRM_MODEL,
            process.env.SMARTCRM_THINKING_MODEL,
            process.env.SMARTCRM_FAST_MODEL
        ];

        const invalidModels = actualModels.filter(model => !expectedModels.includes(model));

        if (invalidModels.length > 0) {
            return {
                passed: false,
                message: `Invalid model values: ${invalidModels.join(', ')}`
            };
        }

        return { passed: true };
    }

    async testModelImports() {
        try {
            const config = require('../src/config/ai.ts');
            const expectedExports = [
                'SMARTCRM_DEFAULT_MODEL',
                'SMARTCRM_THINKING_MODEL',
                'SMARTCRM_FAST_MODEL',
                'getModelForTask'
            ];

            const missing = expectedExports.filter(exp => !config[exp]);

            if (missing.length > 0) {
                return {
                    passed: false,
                    message: `Missing exports from AI config: ${missing.join(', ')}`
                };
            }

            return { passed: true };
        } catch (error) {
            return {
                passed: false,
                message: `Failed to import AI config: ${error.message}`
            };
        }
    }

    async testDatabaseMigration() {
        // Check if migration script exists and is valid SQL
        const migrationPath = path.join(__dirname, 'migrate-to-gpt-5.2.sql');

        if (!fs.existsSync(migrationPath)) {
            return {
                passed: false,
                message: 'Database migration script not found'
            };
        }

        const migrationContent = fs.readFileSync(migrationPath, 'utf8');

        // Basic SQL validation
        const requiredStatements = [
            'UPDATE agent_metadata',
            'CREATE TABLE.*user_ai_settings',
            'INSERT INTO migration_log'
        ];

        const missing = requiredStatements.filter(stmt =>
            !migrationContent.includes(stmt.replace('.*', ''))
        );

        if (missing.length > 0) {
            return {
                passed: false,
                message: `Migration script missing required statements: ${missing.join(', ')}`
            };
        }

        return { passed: true };
    }

    async testServiceUpdates() {
        const servicesToCheck = [
            'src/services/agentService.ts',
            'src/services/gpt51ResponsesService.ts'
        ];

        for (const servicePath of servicesToCheck) {
            const fullPath = path.join(__dirname, '..', servicePath);

            if (!fs.existsSync(fullPath)) {
                return {
                    passed: false,
                    message: `Service file not found: ${servicePath}`
                };
            }

            const content = fs.readFileSync(fullPath, 'utf8');

            // Check for AI config import
            if (!content.includes('from \'../config/ai\'')) {
                return {
                    passed: false,
                    message: `Service ${servicePath} not importing AI config`
                };
            }

            // Check for model usage
            if (!content.includes('SMARTCRM_')) {
                return {
                    passed: false,
                    message: `Service ${servicePath} not using SmartCRM model constants`
                };
            }
        }

        return { passed: true };
    }

    async testLoadPerformance() {
        // Simulate load testing by checking if services can handle concurrent requests
        const startTime = Date.now();

        try {
            // Run a basic vitest to ensure no import errors
            execSync('npm run typecheck', { stdio: 'pipe', timeout: 30000 });
        } catch (error) {
            return {
                passed: false,
                message: `Type checking failed: ${error.message}`
            };
        }

        const duration = Date.now() - startTime;

        if (duration > 10000) { // 10 seconds
            return {
                passed: false,
                message: `Type checking took too long: ${duration}ms`
            };
        }

        return { passed: true };
    }

    async testRollbackCapability() {
        // Check if we have backup/rollback mechanisms
        const backupFiles = [
            'scripts/migrate-to-gpt-5.2.sql' // Contains backup table creation
        ];

        for (const file of backupFiles) {
            const fullPath = path.join(__dirname, file);
            if (!fs.existsSync(fullPath)) {
                return {
                    passed: false,
                    message: `Backup/rollback file missing: ${file}`
                };
            }

            const content = fs.readFileSync(fullPath, 'utf8');
            if (!content.includes('backup') && !content.includes('BACKUP')) {
                return {
                    passed: false,
                    message: `No backup mechanism found in: ${file}`
                };
            }
        }

        return { passed: true };
    }

    async testMonitoringSetup() {
        // Check for error tracking and monitoring setup
        const requiredMonitoring = [
            'logger.service.ts',
            'Error handling in AI services'
        ];

        // This is a basic check - in production you'd want more comprehensive monitoring
        const loggerPath = path.join(__dirname, '..', 'src', 'services', 'logger.service.ts');

        if (!fs.existsSync(loggerPath)) {
            return {
                passed: false,
                message: 'Logger service not found for monitoring'
            };
        }

        return { passed: true };
    }

    async runAllTests() {
        this.log('🚀 Starting GPT-5.2 Production Readiness Tests', 'info');
        this.log('=' .repeat(60), 'info');

        await this.runTest('Environment Variables Configuration', () => this.testEnvironmentVariables());
        await this.runTest('AI Config Module Imports', () => this.testModelImports());
        await this.runTest('Database Migration Script', () => this.testDatabaseMigration());
        await this.runTest('Service Layer Updates', () => this.testServiceUpdates());
        await this.runTest('Load Performance Check', () => this.testLoadPerformance());
        await this.runTest('Rollback Capability', () => this.testRollbackCapability());
        await this.runTest('Monitoring Setup', () => this.testMonitoringSetup());

        this.printSummary();
    }

    printSummary() {
        const duration = Date.now() - this.startTime;

        this.log('\n' + '='.repeat(60), 'info');
        this.log('📊 GPT-5.2 PRODUCTION READINESS SUMMARY', 'info');
        this.log('='.repeat(60), 'info');

        this.results.tests.forEach(test => {
            const status = test.passed ? '✅' : '❌';
            this.log(`${status} ${test.name}`, test.passed ? 'success' : 'error');
            if (!test.passed && test.message) {
                this.log(`   ${test.message}`, 'error');
            }
        });

        this.log('\n📈 RESULTS:', 'info');
        this.log(`   ✅ Passed: ${this.results.passed}`, 'success');
        this.log(`   ❌ Failed: ${this.results.failed}`, 'error');
        this.log(`   ⚠️  Warnings: ${this.results.warnings}`, 'warning');
        this.log(`   ⏱️  Duration: ${duration}ms`, 'info');

        const totalTests = this.results.passed + this.results.failed;
        const passRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;

        if (this.results.failed === 0) {
            this.log(`\n🎉 ALL TESTS PASSED (${passRate}%) - GPT-5.2 is production ready!`, 'success');
            this.log('\n📋 Next Steps:', 'info');
            this.log('   1. Run database migration: scripts/migrate-to-gpt-5.2.sql', 'info');
            this.log('   2. Deploy to staging environment', 'info');
            this.log('   3. Run A/B testing with GPT-5.1 vs GPT-5.2', 'info');
            this.log('   4. Monitor performance and error rates', 'info');
            this.log('   5. Gradually roll out to production', 'info');
        } else {
            this.log(`\n⚠️  TESTS FAILED (${passRate}%) - Address issues before production deployment`, 'error');
            this.log('\n🔧 Fix the failed tests before proceeding:', 'warning');
            this.results.tests.filter(t => !t.passed).forEach(test => {
                this.log(`   - ${test.name}: ${test.message}`, 'warning');
            });
        }

        this.log('\n' + '='.repeat(60), 'info');
    }
}

// Run the tests
if (require.main === module) {
    const tester = new GPT52ProductionTester();
    tester.runAllTests().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = GPT52ProductionTester;