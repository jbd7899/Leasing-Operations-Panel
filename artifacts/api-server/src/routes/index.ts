import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import propertiesRouter from "./properties";
import twilioNumbersRouter from "./twilio-numbers";
import usersRouter from "./users";
import prospectsRouter from "./prospects";
import interactionsRouter from "./interactions";
import inboxRouter from "./inbox";
import tagsRouter from "./tags";
import exportsRouter from "./exports";
import webhooksRouter from "./webhooks";
import internalRouter from "./internal";
import analyticsRouter from "./analytics";
import settingsRouter from "./settings";
import legalRouter from "./legal";
import voiceRouter from "./voice";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(webhooksRouter);
router.use(voiceRouter);
router.use(internalRouter);
router.use(legalRouter);
router.use(propertiesRouter);
router.use(twilioNumbersRouter);
router.use(usersRouter);
router.use(prospectsRouter);
router.use(interactionsRouter);
router.use(inboxRouter);
router.use(tagsRouter);
router.use(exportsRouter);
router.use(analyticsRouter);
router.use(settingsRouter);

export default router;
