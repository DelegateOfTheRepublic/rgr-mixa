import _ from "lodash";
import {Discount} from "../db/models.js";
import {seq} from "../db/db.js";

class DiscountController {
    async list(req, res) {
        const discounts = await Discount.findAll()
        const jsonDiscounts = []
        let jsonDiscount = {}

        for (let discount of discounts) {
            for (let key of Object.keys(discount.toJSON())) {
                if (!_.isNull(discount[key])) {
                    const splitedKey = key.split("Id")
                    if (splitedKey.length === 2) {
                        jsonDiscount[splitedKey[0]] = (await seq.model(splitedKey[0]).findByPk(discount[key])).name
                    } else {
                        jsonDiscount[key] = discount[key]
                    }
                }
            }

            jsonDiscounts.push(jsonDiscount)
        }

        return res.status(200).json({ 'discounts': jsonDiscounts })
    }
    async add(req, res) {
        const idFieldName = Object.keys(req.body).filter(key =>
            key.split("Id").length === 2 && !_.isUndefined(req.body[key])
        )[0]

        await Discount.create({
            [idFieldName]: req.body[idFieldName],
            value: _.toNumber(req.body.value)
        })

        return res.status(200).json('The discount has been added successfully.')
    }
    async update(req, res) {
        const discount = await Discount.update(
            {
                value: _.toNumber(req.body.value),
            },
            {
                where: {
                    id: req.params.id,
                }
            }
        )

        return res.status(200).json({ 'discount': discount })
    }
    async remove(req, res) {
        await Discount.destroy({
            where: {
                id: req.params.id,
            }
        })

        return res.status(200)
    }
}

export default new DiscountController()
