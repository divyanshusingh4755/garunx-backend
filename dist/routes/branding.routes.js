import { Router } from 'express';
import { getTheme, updateTheme } from '../controllers/brand.controllers.js';
import { authenticate } from '../middleware/authenticate.js';
import { hasPermission } from '../middleware/hasPermission.js';
const router = Router();
router.get('/get-theme', getTheme);
router.patch('/update-theme', authenticate, hasPermission("posts:edit"), updateTheme);
export default router;
//# sourceMappingURL=branding.routes.js.map