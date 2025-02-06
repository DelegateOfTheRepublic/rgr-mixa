import fs from 'fs'
import { hashSync, genSaltSync } from 'bcrypt'
import jwt from 'jsonwebtoken'
import randomEmail from 'random-email'
import _ from 'lodash'

import { Cart, Category, Order, Product, ShippingAddress, Token, User } from './models.js'
import { config } from '../config.js'


async function init() {
    const categories = [
        {
            "name": "Молочная продукция",
        },
        {
            "name": "Колбасы",
        },
        {
            "name": "Напитки",
        },
        {
            "name": "Хлебобулочные изделия",
        },
        {
            "name": "Полуфабрикаты",
        }
    ]
    const products = [
        {
            type: "Молоко",
            price: 179.99,
            image: "https://main-cdn.sbermegamarket.ru/hlr-system/549/465/194/101/723/18/100043596473b0.jpg",
        },
        {
            type: "Молочная колбаса",
            price: 279.00,
            image: "https://cdn-img.perekrestok.ru/i/800x800-fit/xdelivery/files/70/ab/ca06e1fd6478ed582fcb943e9c23.jpg",
        },
        {
            type: "Добрый Кола",
            price: 99.99,
            image: "https://pizza-percy.ru/wp-content/uploads/2022/10/Kola-PhotoRoom-1.png",
        },
        {
            type: "Цельнозерновой хлеб",
            price: 54.99,
            image: "https://tvoydom.ru/photos/100/234/1002341835/1002341835.jpg",
        },
        {
            type: "Наггетсы",
            price: 199.99,
            image: "https://delivery.metro-crimea.com/upload/iblock/0aa/wdhrwdj8rnmrs1jb7o293xa2nt0xqz1e/3286564H.jpg",
        }
    ]
    const shippingAddresses = [
        {
            address: "ПВЗ 1"
        },
        {
            address: "ПВЗ 2"
        },
        {
            address: "ПВЗ 3"
        },
        {
            address: "ПВЗ 4"
        }
    ]

    await Category.bulkCreate(categories).then(async (res) => {
        for (let i = 0; i < products.length; i++) {
            const newProduct = await Product.create(products[i])
            newProduct.categoryId = res[i].id
            let date = new Date()
            const response = await fetch(products[i].image)
            const buffer = await response.arrayBuffer()
            let fileName = `${products[i].model}_${date.getFullYear()}_${date.getMonth()}_${date.getDay()}.jpg`
            fs.writeFile(`${process.cwd()}\\uploads\\${fileName}`, new Uint8Array(buffer), () => {
                console.log('Finishing downloading!')
            })
            newProduct.image = `/uploads/${fileName}`
            await newProduct.save()
        }
    })

    await ShippingAddress.bulkCreate(shippingAddresses)

    for (let userId = 1; userId <= 1; userId++) {
        const newUser = await User.create({
            email: randomEmail({ domain: 'mail.ru' }),
            password: hashSync('12345', genSaltSync())
        })
        newUser.isActivated = true
        await newUser.save()

        const token = jwt.sign({ email: newUser.email }, config.SECRET_KEY, { expiresIn: '24h' })
        await Token.create({
            userId,
            token
        })

        const productsCount = _.random(1, 8, false)
        const cart = await Cart.create({ userId })
        let cartTotalCost = 0.0
        newUser.cartId = cart.id
        await newUser.save()

        const orderPacked = await Order.create({ userId })
        orderPacked.shippingAddressId = 1
        orderPacked.status = 'собирается'
        let orderPackedTotalCost = 0;

        const orderDelivered = await Order.create({ userId })
        orderDelivered.shippingAddressId = 3
        orderDelivered.status = 'готов к получению'
        let orderDeliveredTotalCost = 0;

        for (let i = 0; i < productsCount; i++) {
            const product = await Product.findByPk(_.random(1, products.length, false))
            const orderPackedProduct = await Product.findByPk(
                _.random(1, products.length, false)
            )
            const orderDeliveredProduct = await Product.findByPk(
                _.random(1, products.length, false)
            )

            let productAmount = _.random(1, 5, false)
            let cost = product.price * productAmount
            cartTotalCost += cost
            await cart.addProduct(product, { through: { productAmount, cost } })

            productAmount = _.random(1, 5, false)
            cost = orderPackedProduct.price * productAmount
            orderPackedTotalCost += cost
            await orderPacked.addProduct(orderPackedProduct, { through: { productAmount, cost } })

            productAmount = _.random(1, 5, false)
            cost = orderDeliveredProduct.price * productAmount
            orderDeliveredTotalCost += cost
            await orderDelivered.addProduct(orderDeliveredProduct, { through: { productAmount, cost } })
        }

        cart.totalCost = cartTotalCost
        orderPacked.totalCost = orderPackedTotalCost
        orderDelivered.totalCost = orderDeliveredTotalCost

        await cart.save()
        await orderPacked.save()
        await orderDelivered.save()
    }
}

export default init
