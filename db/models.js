import {BOOLEAN, DATE, ENUM, FLOAT, INTEGER, JSON, Model, Op, STRING} from 'sequelize'
import {seq} from './db.js'
import {ORDER_STATUSES, PAYMENT_METHODS, RESERVATION_SECONDS, ROLE_TYPES} from "../consts.js"
import _ from "lodash";
import {sendEmail} from "../emailNotification.js";
import {productStockHTML} from "../htmlBlanks.js";
import {CronJob} from "cron";


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
                productId: this.id,
                [Op.or]: [{ categoryId }, { subcategoryId }]
            }
        })

        return !_.isNull(dicsount)? dicsount.value : 0
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

        for (let user of users) {
            sendEmail(
                msg,
                productStockHTML(product, msg),
                user.email
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
        type: JSON,
        defaultValue: [0, 0, 0, 0, 0]
    }
}, { timestamps: false, })

const Category = seq.define('category', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
    name: {
        type: STRING,
        allowNull: false,
    }
}, { timestamps: false, })

const Subcategory = seq.define('subcategory', {
    id: {
        type: INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        unique: true,
    },
    name: {
        type: STRING,
        allowNull: false,
    }
}, { timestamps: false, })

const Discount = seq.define('discount', {
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
}, { timestamps: false, })

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
    cronJob = null;

    async getDiscountedTotalCost() {
        const orderedProducts = await Order_Product.findAll({
            where: {
                orderId: this.id,
            }
        })

        return _.sum(_.map(orderedProducts, orderedProduct => orderedProduct.getCost()))
    }

    async moveToHistory() {
        const orderHistory = await OrderHistory.create({
            userId: this.userId,
            number: this.number,
            status: ORDER_STATUSES.CANCELED,
            payment: this.payment,
            totalCost: this.totalCost,
            discountedTotalCost: await this.getDiscountedTotalCost(),
            formationDate: this.createdAt,
            arrivalDate: this.arrivalDate,
            receiveDate: this.receiveDate,
            shippingAddressId: this.shippingAddressId,
        })

        const orderProductRaws = (await this.getProducts()).map(
            async function(product) {
                const orderProduct = await Order_Product.findOne({
                    where: {
                        orderId: this.id,
                        productId: product.id,
                    }
                })

                return {
                    product: product,
                    orderProduct: orderProduct,
                }
            }
        )
        for (let orderProductRaw of orderProductRaws) {
            await orderHistory.addProduct(orderProductRaw.product, {
                through: {
                    amount: orderProductRaw.orderProduct.amount,
                    price: orderProductRaw.orderProduct.price,
                    discount: orderProductRaw.orderProduct.discount
                }
            })
            if (this.status === ORDER_STATUSES.CANCELED) {
                await Product.increment(
                {
                        stockQuantity: orderProductRaw.orderProduct.amount
                    },
                    {
                        where: {
                            id: orderProductRaw.product.id
                        }
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

    startAwaitingPayment() {
        const curDate = new Date();
        const dateToRunCode = new Date(curDate.setSeconds(curDate.getSeconds() + RESERVATION_SECONDS));
        this.cronJob = new CronJob(dateToRunCode, async () => {
            await this.moveToHistory()
        })

        this.cronJob.start()
    }

    stopAwaitingPayment() {
        if (!_.isNull(this.cronJob)) {
            this.cronJob.stop()
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

        for (let user of users) {
            sendEmail(
                msg,
                productStockHTML(product, msg),
                user.email
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
            },
            include: Product
        })
        const receivedOrders = await OrderHistory.findAll({
            where: {
                userId: this.id,
            },
            include: Product
        })

        return {
            active: activeOrders,
            received: receivedOrders
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

Category.hasMany(Product, { onDelete: 'CASCADE', onUpdate: 'CASCADE'})
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
Category.hasOne(Discount, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Subcategory.hasOne(Discount, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Subcategory.hasMany(Product, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Category.hasMany(Subcategory, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Product.hasOne(Rating, { onDelete: 'CASCADE', onUpdate: 'CASCADE', foreignKey: 'productId' })


export {
    Cart, Category, Cart_Product, Discount, Order, Order_Product, OrderHistory, OrderHistory_Product, Product,
    Rating, ShippingAddress, Subcategory, Token, User
}
