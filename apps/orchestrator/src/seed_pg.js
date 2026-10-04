"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var database_1 = require("./database");
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var modules, templates, _i, modules_1, mod, _a, templates_1, tpl, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    modules = [
                        { id: 'cyber-news', name: 'Cybersecurity Intelligence', description: 'Monitor and analyze cybersecurity threats', category: 'Security', status: 'ready' },
                        { id: 'github-audit', name: 'GitHub Code Reviewer', description: 'Review code and generate reports', category: 'Development', status: 'ready' },
                        { id: 'ollama-assistant', name: 'Local Ollama Assistant', description: 'Interact with local LLMs', category: 'Assistant', status: 'ready' },
                        { id: 'pdf-research', name: 'PDF Document Research', description: 'RAG and document processing', category: 'Research', status: 'ready' },
                        { id: 'social-gen', name: 'Social Content Generation', description: 'Generate posts and media', category: 'Marketing', status: 'adaptation_required' },
                        { id: 'telegram-notif', name: 'Telegram Notifications', description: 'Send automated alerts to Telegram', category: 'Notifications', status: 'ready' },
                        { id: 'web-research', name: 'Web Deep Research', description: 'Deep autonomous research', category: 'Research', status: 'ready' },
                        { id: 'image-design', name: 'Image & Design', description: 'Design generation and processing', category: 'Design', status: 'ready' },
                    ];
                    templates = [
                        // Cybersecurity
                        { id: 'tpl-10591', module_id: 'cyber-news', n8n_workflow_id: '10591', input_schema: {}, output_schema: {} },
                        { id: 'tpl-10597', module_id: 'cyber-news', n8n_workflow_id: '10597', input_schema: {}, output_schema: {} },
                        { id: 'tpl-14410', module_id: 'cyber-news', n8n_workflow_id: '14410', input_schema: {}, output_schema: {} },
                        // GitHub
                        { id: 'tpl-10242', module_id: 'github-audit', n8n_workflow_id: '10242', input_schema: {}, output_schema: {} },
                        { id: 'tpl-11181', module_id: 'github-audit', n8n_workflow_id: '11181', input_schema: {}, output_schema: {} },
                        { id: 'tpl-14429', module_id: 'github-audit', n8n_workflow_id: '14429', input_schema: {}, output_schema: {} },
                        // Local Ollama
                        { id: 'tpl-2703', module_id: 'ollama-assistant', n8n_workflow_id: '2703', input_schema: {}, output_schema: {} },
                        { id: 'tpl-3859', module_id: 'ollama-assistant', n8n_workflow_id: '3859', input_schema: {}, output_schema: {} },
                        { id: 'tpl-5148', module_id: 'ollama-assistant', n8n_workflow_id: '5148', input_schema: {}, output_schema: {} }, // The verified RAG one
                        // PDF
                        { id: 'tpl-20028', module_id: 'pdf-research', n8n_workflow_id: '20028', input_schema: {}, output_schema: {} },
                        { id: 'tpl-3586', module_id: 'pdf-research', n8n_workflow_id: '3586', input_schema: {}, output_schema: {} },
                        // Social
                        { id: 'tpl-19932', module_id: 'social-gen', n8n_workflow_id: '19932', input_schema: {}, output_schema: {} },
                        { id: 'tpl-2557', module_id: 'social-gen', n8n_workflow_id: '2557', input_schema: {}, output_schema: {} },
                        { id: 'tpl-4352', module_id: 'social-gen', n8n_workflow_id: '4352', input_schema: {}, output_schema: {} },
                        // Telegram
                        { id: 'tpl-17010', module_id: 'telegram-notif', n8n_workflow_id: '17010', input_schema: {}, output_schema: {} },
                        { id: 'tpl-4640', module_id: 'telegram-notif', n8n_workflow_id: '4640', input_schema: {}, output_schema: {} },
                        // Web Research
                        { id: 'tpl-2768', module_id: 'web-research', n8n_workflow_id: '2768', input_schema: {}, output_schema: {} },
                        { id: 'tpl-2883', module_id: 'web-research', n8n_workflow_id: '2883', input_schema: {}, output_schema: {} },
                        { id: 'tpl-3291', module_id: 'web-research', n8n_workflow_id: '3291', input_schema: {}, output_schema: {} },
                        // Image
                        { id: 'tpl-10326', module_id: 'image-design', n8n_workflow_id: '10326', input_schema: {}, output_schema: {} }
                    ];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 10, 11, 13]);
                    console.log('Seeding Modules...');
                    _i = 0, modules_1 = modules;
                    _b.label = 2;
                case 2:
                    if (!(_i < modules_1.length)) return [3 /*break*/, 5];
                    mod = modules_1[_i];
                    return [4 /*yield*/, database_1.db.query("\n        INSERT INTO automata_modules (id, name, description, category, status, dependencies)\n        VALUES ($1, $2, $3, $4, $5, $6)\n        ON CONFLICT (id) DO UPDATE SET\n          name = EXCLUDED.name,\n          description = EXCLUDED.description,\n          category = EXCLUDED.category,\n          status = EXCLUDED.status\n      ", [mod.id, mod.name, mod.description, mod.category, mod.status, JSON.stringify({})])];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log('Seeding Templates...');
                    _a = 0, templates_1 = templates;
                    _b.label = 6;
                case 6:
                    if (!(_a < templates_1.length)) return [3 /*break*/, 9];
                    tpl = templates_1[_a];
                    return [4 /*yield*/, database_1.db.query("\n        INSERT INTO automata_templates (id, module_id, n8n_workflow_id, input_schema, output_schema)\n        VALUES ($1, $2, $3, $4, $5)\n        ON CONFLICT (id) DO UPDATE SET\n          module_id = EXCLUDED.module_id,\n          n8n_workflow_id = EXCLUDED.n8n_workflow_id\n      ", [tpl.id, tpl.module_id, tpl.n8n_workflow_id, JSON.stringify(tpl.input_schema), JSON.stringify(tpl.output_schema)])];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8:
                    _a++;
                    return [3 /*break*/, 6];
                case 9:
                    console.log('Seed successful');
                    return [3 /*break*/, 13];
                case 10:
                    error_1 = _b.sent();
                    console.error('Seed error', error_1);
                    return [3 /*break*/, 13];
                case 11: return [4 /*yield*/, database_1.db.end()];
                case 12:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 13: return [2 /*return*/];
            }
        });
    });
}
seed();
