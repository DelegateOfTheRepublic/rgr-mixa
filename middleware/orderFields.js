import _ from 'lodash';

const fields = ['payment', 'shippingAddressId']
const requiredFields = ['shippingAddressId'];

export const verifyOrderFields = (req, res, next) => {
    const reqBodyKeys = Object.keys(req.body)

    for (let field of fields) {
        if (!reqBodyKeys.includes(field)) {
            return res.status(400).json({ error: `Key '${field}' is required` })
        }
    }

    req.order = {
        payment: req.body.payment,
        shippingAddressId: req.body.shippingAddressId,
    }

    next()
}

export const verifyOrderField = (req, res, next) => {
    const reqBodyKeys = Object.keys(req.body);

    if (!_.some(requiredFields, requiredField => reqBodyKeys.includes(requiredField))) {
        return res.status(400).json({ error: 'No required keys' })
    }

    req.order = {
        payment: _.get(req.body, 'payment', null),
        shippingAddressId: req.body.shippingAddressId,
    }
    next()
}
