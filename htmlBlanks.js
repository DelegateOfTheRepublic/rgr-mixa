import _ from "lodash";

const style =
    `
    <style>
      .products {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
    
      .products__product {
        padding: 12px;
        border-radius: 8px;
        background: rgba(143, 109, 215, 0.8);
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(6.4px);
        max-width: 500px;
      }
    
      img {
        width: 100px;
      }
    
      .title {
        display: flex;
        align-items: center;
        gap: 24px;
      }
    
      .body {
        display: flex;
        gap: 12px;
        margin-top: 24px;
      }
    </style>
    `

export const arrivedProductsHTML = (arrivedProducts) => {
    const htmlProduct = (product) =>
        `
        <div class="products__product">
            <div class="title">
                <img src="${product.image}" alt="image"/>
                <span>${product.name}</span>
            </div>
            <div class="body">
                <span>Ценая товара: ${product.price}&#8381;</span>
                <span>Количество: ${product.amount}</span>
                <span>Стоимость: ${product.price * product.amount}&#8381;</span>
            </div>
        </div>
        `
    const html =
        `
            <style>
              .opp-address {
                padding: 12px;
                border-radius: 8px;
                background: rgba(143, 109, 215, 0.8);
                box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(6.4px);
                max-width: 500px;
              }
            </style>
            
            ${style}
            
            <div class="products">
              <p class="opp-address">${arrivedProducts.shippingAddress}</p>
              ${_.join(_.map(arrivedProducts.products, (product) => htmlProduct(product)))}
            </div>
        `

    return html
}

export const productStockHTML = (product, stockMsg) => {
    const html =
        `
            <style>
                .stock {
                    padding: 12px;
                    border-radius: 8px;
                    background: rgba(143, 109, 215, 0.8);
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
                    backdrop-filter: blur(6.4px);
                    max-width: 500px;
                }
            </style>
            
            ${style}
            
            <div class="products">
                <p class="stock">${stockMsg}</p>
                <div class="products__product">
                    <div class="title">
                        <img src="${product.image}" alt="image"/>
                        <span>${product.name}</span>
                    </div>
                </div>
            </div>
        `

    return html
}
