import {ROLE_TYPES} from "../consts.js";
import _ from "lodash";

export const verifyAdmin = async (req, res, next) => {
    if (!_.isEqual(req.user.role, ROLE_TYPES.ADMIN)) {
        return res.status(403).json({ 'error': 'Access denied.' })
    }

    next()
}
