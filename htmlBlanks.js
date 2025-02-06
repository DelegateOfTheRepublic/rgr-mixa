import ejs from 'ejs';
import fs from 'fs';

const styles = {
    products: 'display: flex; flex-direction: column; gap: 4px;',
    opp_address: 'padding: 12px; border-radius: 8px; background: rgba(143, 109, 215, 0.8); ' +
        'box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); backdrop-filter: blur(6.4px); max-width: 500px;',
    product: 'padding: 12px; border-radius: 8px; background: rgba(143, 109, 215, 0.8); ' +
        'box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); backdrop-filter: blur(6.4px); max-width: 500px;',
    title: 'display: flex; align-items: center; gap: 24px;',
    body: 'display: flex; gap: 12px; margin-top: 24px;',
    img: 'width: 100px;',
    stock: 'padding: 12px; border-radius: 8px; background: rgba(143, 109, 215, 0.8); ' +
        'box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); backdrop-filter: blur(6.4px); max-width: 500px;'
}

export const arrivedProductsHTML = (arrivedProducts) => {
    return ejs.render(
        fs.readFileSync(`${process.cwd()}/templates/arrivedProducts.ejs`, 'utf-8'),
        {
            arrivedProducts,
            styles,
        }
    )
}

export const productStockHTML = (product, stockMsg) => {
    return ejs.render(
        fs.readFileSync(`${process.cwd()}/templates/productStock.ejs`, 'utf-8'),
        {
            product,
            styles,
            stockMsg,
        }
    )
}
