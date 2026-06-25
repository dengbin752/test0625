# 项目需求

根据提供的产品数据信息，获取远程Shipping信息，最后统计显示。

## 核心流程

### 获取SKU相关的数据信息

#### 产品列表信息获取

产品数据: d`data_examples/product_list.json`

#### 根据下面步骤统计相关数据：

1. subtotal
a. For each line item:
Line Total = SKU price × quantity
b. Subtotal = sum of all line totals
c. Note: SKU price already includes GST.

2. Calculate GST
a. GST = 10% of Subtotal
b. You must compute this value yourself (do not hard code it).

3. Calculate Total
a. Total = Subtotal + GST + Shipment Fee

4. Shipment Fee
Shipment Fee通过REST API获取 

参考文档：
- Auth: https://developers.auspost.com.au/apis/shipping-and-tracking/reference/restful
- Track Item: https://developers.auspost.com.au/apis/shipping-and-tracking/reference/track-items

Auth信息：
```
API Key: 8ba91b84-ca46-40e6-9680-77e55e3c5942
Password: kE1Rt1ualfjjL2ESLLB4
```

可用于测试的产品Shipping信息参考：`data_examples/shipment_products.txt`

6. Images for SKUs
Use placeholder images if you cannot find the real ones.

#### 显示输出

Your final output (web page, report, or console output) must clearly show:

1. Each SKU line:
- SKU code
- Name / description
- Quantity
- Price per unit
- Line total (price × quantity)
- Image (real or placeholder)

2. Summary section:
- Subtotal
- GST (10% of Subtotal)
- Shipment Fee
- Total (Subtotal + GST + Shipment Fee)

3. Tracking Information

Tracking部分额外增加3个字段:
- Assigned Tracking 
- Tracking No 
- Logistics Company

Tracking信息通过上述API得到：
（需要根据不同的logistics）
a. Use the provided tracking API details (StarTrack, TNT, etc.).
b. For each tracking number, call the correct API based on the logistics company.
c. Display basic tracking information (e.g. current status, last update).

4. Shipment Fee (Bonus)

Rules:
• Shipment fee should be estimated using SKU dimensions:
- Weight
- Width
- Length
- Height
- (or Volume if provided)
- Our original postcode is: 2111 (Ryde, NSW).
- The destination postcode comes from the customer's address

## 技术栈

1. Backend: Python，uv包管理，FastAPI,  
2. Frontend: React, Tailwindcss, pnpm包管理，vite
3. （无数据库）


