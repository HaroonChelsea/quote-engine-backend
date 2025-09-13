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
          // Remove timeout for now to debug the issue
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

    const result = await this.executeGraphQLQuery(query, {
      input: customerData,
    });

    // Check for user errors
    if (result?.customerCreate?.userErrors?.length > 0) {
      const errors = result.customerCreate.userErrors;
      console.error('Shopify customer creation errors:', errors);
      throw new Error(
        `Customer creation failed: ${errors.map((e) => e.message).join(', ')}`,
      );
    }

    return result;
  }

  async getCustomerByEmail(email: string): Promise<any> {
    const query = `
      query getCustomerByEmail($query: String!) {
        customers(first: 1, query: $query) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
            }
          }
        }
      }
    `;

    try {
      const result = await this.executeGraphQLQuery(query, {
        query: `email:${email}`,
      });

      if (result?.customers?.edges?.length > 0) {
        return {
          customer: result.customers.edges[0].node,
        };
      }

      return null;
    } catch (error) {
      // If there's any error (timeout, network, etc.), return null
      // This allows the customer creation to proceed
      console.warn(
        `Error checking existing customer by email ${email}:`,
        error.message,
      );
      return null;
    }
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

    const result = await this.executeGraphQLQuery(query, {
      input: draftOrderData,
    });

    console.log(
      'Shopify draft order creation result:',
      JSON.stringify(result, null, 2),
    );

    // Check for user errors
    if (result?.draftOrderCreate?.userErrors?.length > 0) {
      const errors = result.draftOrderCreate.userErrors;
      console.error('Shopify draft order creation errors:', errors);
      throw new Error(
        `Draft order creation failed: ${errors.map((e) => e.message).join(', ')}`,
      );
    }

    return result;
  }

  /**
   * Get valid provinces for countries - using static data for reliability
   */
  async getValidProvinces(): Promise<Record<string, string[]>> {
    // Return static province data directly - no need for complex GraphQL queries
    // This is more reliable and covers the main countries we need
    return this.getFallbackProvinces();
  }

  /**
   * Get fallback province data when API fails
   */
  private getFallbackProvinces(): Record<string, string[]> {
    return {
      US: [
        'AL',
        'AK',
        'AZ',
        'AR',
        'CA',
        'CO',
        'CT',
        'DE',
        'FL',
        'GA',
        'HI',
        'ID',
        'IL',
        'IN',
        'IA',
        'KS',
        'KY',
        'LA',
        'ME',
        'MD',
        'MA',
        'MI',
        'MN',
        'MS',
        'MO',
        'MT',
        'NE',
        'NV',
        'NH',
        'NJ',
        'NM',
        'NY',
        'NC',
        'ND',
        'OH',
        'OK',
        'OR',
        'PA',
        'RI',
        'SC',
        'SD',
        'TN',
        'TX',
        'UT',
        'VT',
        'VA',
        'WA',
        'WV',
        'WI',
        'WY',
      ],
      CA: [
        'AB',
        'BC',
        'MB',
        'NB',
        'NL',
        'NS',
        'NT',
        'NU',
        'ON',
        'PE',
        'QC',
        'SK',
        'YT',
      ],
    };
  }

  /**
   * Validate and normalize province code for a given country
   */
  async validateProvinceCode(
    countryCode: string,
    provinceCode: string,
  ): Promise<string> {
    try {
      const validProvinces = await this.getValidProvinces();
      const countryProvinces = validProvinces[countryCode] || [];

      // If the province code is already valid, return it
      if (countryProvinces.includes(provinceCode)) {
        return provinceCode;
      }

      // Try to find a match by common mappings
      const commonMappings: Record<string, Record<string, string>> = {
        US: {
          California: 'CA',
          'New York': 'NY',
          Texas: 'TX',
          Florida: 'FL',
          Illinois: 'IL',
          Pennsylvania: 'PA',
          Ohio: 'OH',
          Georgia: 'GA',
          'North Carolina': 'NC',
          Michigan: 'MI',
        },
        CA: {
          Ontario: 'ON',
          Quebec: 'QC',
          'British Columbia': 'BC',
          Alberta: 'AB',
          Manitoba: 'MB',
          Saskatchewan: 'SK',
          'Nova Scotia': 'NS',
          'New Brunswick': 'NB',
          'Newfoundland and Labrador': 'NL',
          'Prince Edward Island': 'PE',
          'Northwest Territories': 'NT',
          Nunavut: 'NU',
          Yukon: 'YT',
        },
      };

      const countryMappings = commonMappings[countryCode] || {};
      const mappedProvince = countryMappings[provinceCode];

      if (mappedProvince && countryProvinces.includes(mappedProvince)) {
        return mappedProvince;
      }

      // Default fallbacks
      if (countryCode === 'US') {
        return 'CA'; // Default to California
      } else if (countryCode === 'CA') {
        return 'ON'; // Default to Ontario
      }

      return provinceCode; // Return original if no mapping found
    } catch (error) {
      console.error('Error validating province code:', error);
      // Return safe defaults
      return countryCode === 'US' ? 'CA' : 'ON';
    }
  }
}
