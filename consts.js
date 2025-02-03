export const ROLE_TYPES = Object.freeze({
    ADMIN: 'администратор',
    CUSTOMER: 'покупатель'
})

export const ORDER_STATUSES = Object.freeze({
    AWAITING_PAYMENT: 'ожидает оплаты',
    PACKING: 'сборка',
    ON_THE_WAY: 'в пути',
    AT_THE_POINT: 'в пункте выдачи',
    RECEIVED: 'получен',
    CANCELED: 'отменен'
})

export const PAYMENT_METHODS = Object.freeze({
    BY_CREDIT_CARD_ONLINE: 'кредитной картой онлайн',
    BY_FPS: 'системой быстрых платежей',
    BY_UPON_RECEIPT: 'при получении'
})

export const RATING_STARS = Object.freeze({
    FIVE: 5,
    FOUR: 4,
    THREE: 3,
    TWO: 2,
    ONE: 1
})

export const RESERVATION_MINUTES = 30
