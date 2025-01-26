import _ from 'lodash';

const fields = ['type', 'price', 'image', 'categoryId']

export const verifyProductFields = (req, res, next) => {
    let reqBodyKeys = Object.keys(req.body);
    reqBodyKeys.push(...Object.keys(req.files))

    for (let field of fields) {
        if (!reqBodyKeys.includes(field)) {
            return res.status(400).json({ error: `Key '${field}' is required` })
        }
    }

    req.product = {
        type: req.body.type,
        price: req.body.price,
        categoryId: req.body.categoryId,
        image: req.files['image']
    }
    next()
}

export const verifyProductField = (req, res, next) => {
    const reqBodyKeys = Object.keys(req.body);

    if (!_.some(fields, field => reqBodyKeys.includes(field))) {
        return res.status(400).json({ error: 'No keys' })
    }

    req.product = {
        type: _.get(req.body, 'type', undefined),
        price: _.get(req.body, 'price', undefined),
        categoryId: _.get(req.body, 'categoryId', undefined),
        image: req.files?.['image'] || undefined
    }
    next()
}
