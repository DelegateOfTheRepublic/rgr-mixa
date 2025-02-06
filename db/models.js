import {BOOLEAN, DataTypes, DATE, ENUM, FLOAT, INTEGER, Model, Op, STRING} from 'sequelize'
import {seq} from './db.js'
import {ORDER_STATUSES, PAYMENT_METHODS, RESERVATION_SECONDS, ROLE_TYPES} from "../consts.js"
import _ from "lodash";
import {sendEmail} from "../emailNotification.js";
import {productStockHTML} from "../htmlBlanks.js";
import {CronJob} from "cron";
import {cronJob} from "../index.js";


class Product extends Model {
    async getCategory() {
        return await Category.findByPk(this.categoryId)
    }

    async getSubcategory() {
        return await Subcategory.findByPk(this.subcategoryId)
    }

    async getImagePath() {
        const categoryName = (await this.getCategory()).name
        const subcategoryName = (await this.getSubcategory()).name

        return `uploads/${categoryName}/${subcategoryName}`
    }

    async getRating() {
        const stars = (await Rating.findOne({
            where: {
                productId: this.id,
            }
        })).stars

        const rating = _.sum(stars.map((star, index) => star * (index + 1))) / _.sum(stars) || 0

        return rating
    }

    async getDiscount() {
        const categoryId = (await this.getCategory()).id
        const subcategoryId = (await this.getSubcategory()).id

        const dicsount = await Discount.findOne({
            where: {
                [Op.or]: [{ productId: this.id }, { categoryId }, { subcategoryId }]
            }
        })

        return !_.isNull(dicsount)? dicsount.value : 0
    }

    async applyDiscount() {
        await Cart.updateTotalCosts(this)
    }
}

Product.init(
    {
        manufacturer: {
            type: STRING,
            allowNull: false,
        },
        model: {
            type: STRING,
            allowNull: false,
        },
        weight: {
            type: FLOAT,
            allowNull: false,
        },
        price: {
            type: FLOAT,
            allowNull: false,
        },
        ratingNumber: {
            type: INTEGER,
            defaultValue: 0
        },
        stockQuantity: {
            type: INTEGER,
            allowNull: false,
        },
        image: {
            type: STRING,
            allowNull: false,
        }
    },
    {
        sequelize: seq,
        timestamps: false,
        hooks: {
            async afterUpdate(instance, options) {
                if (instance.previous().stockQuantity === 0 && instance.stockQuantity !== 0) {
                    await Wishlist.sendNotification(instance, 'Товар вновь в наличии')
                    await Cart.sendNotification(instance, 'Товар вновь в наличии')
                } else if (instance.previous().stockQuantity !== 0 && instance.stockQuantity === 0) {
                    await Wishlist.sendNotification(instance, 'Товар закончился')
                    await Cart.sendNotification(instance, 'Товар закончился')
                }
            }
        }
    }
)

class Wishlist extends Model {
    static async sendNotification(product, msg) {
        const users = await product.getUsers()

        product = product.toJSON()
        product.img = {
            fileName: product.image.split('/').slice(-1),
            path: `${process.cwd()}${product.image}`,
            cid: product.model,
        }

        for (let user of users) {
            sendEmail(
                msg,
                productStockHTML(product, msg),
                user.email,
                [product.img]
            )
        }
    }
}

Wishlist.init({}, { sequelize: seq, timestamps: false, })

const Rating = seq.define('rating', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    stars: {
        type: DataTypes.JSON,
        defaultValue: [0, 0, 0, 0, 0]
    }
}, { timestamps: false, })

class Category extends Model {
    async applyDiscount() {
        const products = await Product.findAll({
            categoryId: this.id,
        })

        for (let product of products) {
            await product.applyDiscount()
        }
    }
}

Category.init(
    {
        name: {
            type: STRING,
            allowNull: false,
        }
    },
    {
        sequelize: seq,
        timestamps: false,
    }
)

class Subcategory extends Model {
    async applyDiscount() {
        const products = await Product.findAll({
            where: {
                subcategoryId: this.subcategoryId,
            }
        })

        for (let product of products) {
            await product.applyDiscount()
        }
    }
}

Subcategory.init(
    {
        name: {
            type: STRING,
            allowNull: false,
        }
    },
    {
        sequelize: seq,
        timestamps: false,
    }
)

const Discount = seq.define(
    'discount',
    {
        id: {
            type: INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
            unique: true,
        },
        value: {
            type: FLOAT,
            allowNull: false,
        }
    },
    {
        timestamps: false,
        hooks: {
            async afterSave(instance, options) {
                const modelNameId = Object.keys(instance.toJSON())
                    .filter(key => key.endsWith("Id") && !_.isNull(instance[key]))[0]

                const modelName = _.capitalize(modelNameId.split("Id")[0])
                await (await seq.model(modelName).findByPk(instance[modelNameId])).applyDiscount()
            },
            async afterDestroy(instance, options) {
                const modelNameId = Object.keys(instance.toJSON())
                    .filter(key => key.endsWith("Id") && !_.isNull(instance[key]))[0]

                const modelName = _.capitalize(modelNameId.split("Id")[0])
                await (await seq.model(modelName).findByPk(instance[modelNameId])).applyDiscount()
            }
        }
    }
)

const OrderHistory = seq.define('order_history', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    number: {
        type: STRING
    },
    status: {
        type: STRING
    },
    payment: {
        type: STRING,
    },
    totalCost: {
        type: FLOAT,
    },
    discountedTotalCost: {
        type: FLOAT
    },
    formationDate: {
        type: DATE,
    },
    deliveryDate: {
        type: DATE,
    },
    arrivalDate: {
        type: DATE,
    },
    receiveDate: {
        type: DATE
    },
})

class OrderHistory_Product extends Model {
    getCost() {
        return this.price * this.amount * (1 - this.discount)
    }
}

OrderHistory_Product.init(
    {
        amount: {
            type: INTEGER,
        },
        price: {
            type: FLOAT,
        },
        discount: {
            type: FLOAT,
            defaultValue: 0
        }
    },
    {
        sequelize: seq,
        timestamps: false,
    }
)

const ShippingAddress = seq.define('shipping_address', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    address: {
        type: STRING,
        allowNull: false,
    }
}, { timestamps: false, })

class Order extends Model {
    async getDiscountedTotalCost() {
        const orderedProducts = await Order_Product.findAll({
            where: {
                orderId: this.id,
            }
        })

        return _.sum(_.map(orderedProducts, orderedProduct =>
            orderedProduct.discount === 0?
                0 : (1 - orderedProduct.discount) * orderedProduct.amount * orderedProduct.price
        ))
    }

    async moveToHistory() {
        const orderHistory = await OrderHistory.create({
            userId: this.userId,
            number: this.number,
            status: this.status,
            payment: this.payment,
            totalCost: this.totalCost,
            discountedTotalCost: await this.getDiscountedTotalCost(),
            formationDate: this.createdAt,
            deliveryDate: this.deliveryDate,
            arrivalDate: this.arrivalDate,
            receiveDate: this.receiveDate,
            shippingAddressId: this.shippingAddressId,
        })

        const products = await this.getProducts()

        for (let product of products) {
            const orderProduct = await Order_Product.findOne({
                where: {
                    orderId: this.id,
                    productId: product.id,
                }
            })

            await orderHistory.addProduct(product, {
                through: {
                    amount: orderProduct.amount,
                    price: orderProduct.price,
                    discount: orderProduct.discount
                }
            })
            if (this.status === ORDER_STATUSES.CANCELED) {
                await product.update({
                    stockQuantity: product.stockQuantity + orderProduct.amount,
                })
            }
        }

        await Order.destroy({
            where: {
                id: this.id,
            }
        })

        return orderHistory
    }

    sendNotification(email) {
        const html =
            `<p>Статус заказа <strong>№${this.number}</strong> изменен на <strong>${this.status}</strong></p>`

        sendEmail(`Заказ №${this.number}`, html, email)
    }

    async startAwaitingPayment() {
        const curDate = new Date();
        const dateToRunCode = new Date(curDate.setSeconds(curDate.getSeconds() + RESERVATION_SECONDS));
        cronJob.name = new CronJob(dateToRunCode, async () => {
            await this.update({ status: ORDER_STATUSES.CANCELED })
            await this.moveToHistory()
        })

        cronJob.name.start()
    }

    async stopAwaitingPayment() {
        if (!_.isNull(cronJob.name)) {
            cronJob.name.stop()
        }
    }
}

Order.init(
    {
        number: {
            type: STRING,
            defaultValue: 0,
            set(value) {
                if (_.isUndefined(this.getDataValue('number'))) {
                    this.setDataValue('number', value);
                } else {
                    throw new Error("Field 'number' is readonly")
                }
            }
        },
        status: {
            type: ENUM,
            values: Object.values(ORDER_STATUSES),
            defaultValue: ORDER_STATUSES.AWAITING_PAYMENT
        },
        payment: {
            type: ENUM,
            values: Object.values(PAYMENT_METHODS),
            defaultValue: PAYMENT_METHODS.BY_CREDIT_CARD_ONLINE
        },
        totalCost: {
            type: FLOAT,
            defaultValue: 0
        },
        deliveryDate: {
            type: DATE,
        },
        arrivalDate: {
            type: DATE,
        },
        receiveDate: {
            type: DATE
        },
    },
    {
        sequelize: seq
    }
)

class Cart extends Model {
    static async updateTotalCosts(product) {
        const cartProducts = await Cart_Product.findAll({
            where: {
                productId: product.id
            }
        })
        const discount = await product.getDiscount()

        for (let cartProduct of cartProducts) {
            let oldCost = cartProduct.cost
            await cartProduct.update({
                cost: cartProduct.amount * product.price * (1 - discount),
            })
            const cart = await Cart.findByPk(cartProduct.cartId)
            await cart.update({
                totalCost: cart.totalCost - oldCost + cartProduct.amount * product.price * (1 - discount),
            })
        }
    }

    async getProductCost(productId) {
        const cartProduct = await Cart_Product.findOne({
            where: {
                cartId: this.id,
                productId,
            }
        })

        return cartProduct.cost
    }

    static async sendNotification(product, msg) {
        const users = _.map(
            await product.getCarts(),
            async cart => await User.findOne({ cartId: cart.id })
        )

        product = product.toJSON()
        product.img = {
            fileName: product.image.split('/').slice(-1),
            path: `${process.cwd()}${product.image}`,
            cid: product.model,
        }

        for (let user of users) {
            sendEmail(
                msg,
                productStockHTML(product, msg),
                user.email,
                [product.img]
            )
        }
    }
}

Cart.init(
    {
        totalCost: {
            type: FLOAT
        }
    },
    {
        sequelize: seq,
    }
)

class User extends Model {
    async getCart() {
        return await Cart.findByPk(this.cartId, { include: Product })
    }

    async getOrders() {
        const activeOrders = await Order.findAll({
            where: {
                userId: this.id,
                status: {
                    [Op.notIn]: [ORDER_STATUSES.RECEIVED, ORDER_STATUSES.CANCELED]
                }
            },
            include: Product
        })
        const receivedOrders = await OrderHistory.findAll({
            where: {
                userId: this.id,
                status: ORDER_STATUSES.RECEIVED
            },
            include: Product
        })
        const canceledOrders = await OrderHistory.findAll({
            where: {
                userId: this.id,
                status: ORDER_STATUSES.CANCELED
            },
            include: Product
        })

        return {
            active: activeOrders,
            received: receivedOrders,
            canceled: canceledOrders
        }
    }
}

User.init(
    {
        email: {
            type: STRING,
            allowNull: false,
        },
        password: {
            type: STRING,
            allowNull: false,
        },
        isActivated: {
            type: BOOLEAN,
            defaultValue: false,
        },
        role: {
            type: ENUM,
            values: Object.values(ROLE_TYPES),
            defaultValue: ROLE_TYPES.CUSTOMER,
        }
    },
    {
        sequelize: seq
    }
)

const Token = seq.define('token', {
      id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      token: {
        type: STRING,
        allowNull: false
      }
})

class Order_Product extends Model {
    getCost() {
        return this.amount * this.price * (1 - this.discount)
    }
}

Order_Product.init(
    {
        amount: {
            type: INTEGER,
            defaultValue: 1,
        },
        price: {
            type: FLOAT,
        },
        discount: {
            type: FLOAT,
            defaultValue: 0
        }
    },
    {
        sequelize: seq,
        timestamps: false,
    }
)

const Cart_Product = seq.define('Cart_Product', {
    amount: {
        type: INTEGER,
        defaultValue: 1
    },
    cost: {
        type: FLOAT,
        defaultValue: 0
    }
}, { timestamps: false, })

Category.hasMany(Product, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'categoryId'})
User.hasOne(Token, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'userId' })
User.hasMany(Order, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'userId' })
User.hasMany(OrderHistory, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'userId' })
Product.belongsToMany(Cart, { through: Cart_Product, foreignKey: 'productId' })
Cart.belongsToMany(Product, { through: Cart_Product, foreignKey: 'cartId' })
Cart.hasOne(User, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'cartId' })
ShippingAddress.hasMany(Order, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
ShippingAddress.hasMany(OrderHistory, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Product.belongsToMany(Order, { through: Order_Product, foreignKey: 'productId' })
Order.belongsToMany(Product, { through: Order_Product, foreignKey: 'orderId' })
Product.belongsToMany(OrderHistory, { through: OrderHistory_Product, foreignKey: 'productId' })
OrderHistory.belongsToMany(Product, { through: OrderHistory_Product })
Product.belongsToMany(User, { through: Wishlist, foreignKey: 'productId' })
User.belongsToMany(Product, { through: Wishlist, foreignKey: 'userId' })
Product.hasOne(Discount, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'productId' })
Category.hasOne(Discount, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'categoryId' })
Subcategory.hasOne(Discount, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'subcategoryId' })
Subcategory.hasMany(Product, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'subcategoryId' })
Category.hasMany(Subcategory, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'categoryId' })
Product.hasOne(Rating, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'productId' })


export {
    Cart, Category, Cart_Product, Discount, Order, Order_Product, OrderHistory, OrderHistory_Product, Product,
    Rating, ShippingAddress, Subcategory, Token, User
}
