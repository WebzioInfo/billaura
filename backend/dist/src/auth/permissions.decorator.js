"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS_KEY = void 0;
exports.Permissions = Permissions;
const common_1 = require("@nestjs/common");
exports.PERMISSIONS_KEY = "permissions";
function Permissions(...permissions) {
    return (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
}
//# sourceMappingURL=permissions.decorator.js.map