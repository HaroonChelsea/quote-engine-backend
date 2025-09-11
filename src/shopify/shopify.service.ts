import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  shopifyApi,
  LATEST_API_VERSION,
  BillingInterval,
} from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private shopify: any;

  constructor(private configService: ConfigService) {
    this.initializeShopify();
  }

  private initializeShopify() {
    const shopName = this.configService.get('SHOPIFY_SHOP_NAME');
    const accessToken = this.configService.get('SHOPIFY_API_ACCESS_TOKEN');

    if (!shopName || !accessToken) {
      this.logger.error(
        'Shopify configuration missing. Please check SHOPIFY_SHOP_NAME and SHOPIFY_API_ACCESS_TOKEN in .env',
      );
      return;
    }

    // For now, we'll use direct HTTP calls instead of the Shopify SDK
    // to avoid the runtime adapter issues
    this.logger.log('Shopify service initialized (using direct HTTP calls)');
  }

  async executeGraphQLQuery(query: string, variables: any = {}): Promise<any> {
    const shopName = this.configService.get('SHOPIFY_SHOP_NAME');
    const accessToken = this.configService.get('SHOPIFY_API_ACCESS_TOKEN');

    if (!shopName || !accessToken) {
      throw new Error('Shopify configuration missing. Check configuration.');
    }

    const shopDomain = `${shopName}.myshopify.com`;

    try {
      const response = await fetch(
        `https://${shopDomain}/admin/api/${LATEST_API_VERSION}/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({
            query,
            variables,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        this.logger.error('GraphQL errors:', data.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data;
    } catch (error) {
      this.logger.error('Error executing GraphQL query:', error);
      throw error;
    }
  }

  async getProduct(productId: string): Promise<any> {
    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          description
          productType
          vendor
          status
          createdAt
          updatedAt
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          options {
            id
            name
            position
            values
            optionValues {
              id
              name
              hasVariants
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                compareAtPrice
                sku
                barcode
                availableForSale
                inventoryQuantity
                selectedOptions {
                  name
                  value
                }
                metafields(first: 10) {
                  edges {
                    node {
                      id
                      namespace
                      key
                      value
                      type
                    }
                  }
                }
              }
            }
          }
          metafields(first: 10) {
            edges {
              node {
                id
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
    `;

    const variables = {
      id: `gid://shopify/Product/${productId}`,
    };

    return this.executeGraphQLQuery(query, variables);
  }

  async createCustomer(customerData: any): Promise<any> {
    const query = `
      mutation customerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            firstName
            lastName
            email
            phone
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    return this.executeGraphQLQuery(query, { input: customerData });
  }

  async createDraftOrder(draftOrderData: any): Promise<any> {
    const query = `
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
            totalPrice
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    return this.executeGraphQLQuery(query, { input: draftOrderData });
  }
}
