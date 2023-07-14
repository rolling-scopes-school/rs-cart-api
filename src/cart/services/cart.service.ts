import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import pg from '../../index';
import { Knex } from 'knex';
import { Cart } from '../models';

interface RequestBody {
  product_id: string;
  count: number;
}

@Injectable()
export class CartService {

  async findByUserId(userId: string): Promise<Cart> {
    try {

      const cart_status = 'OPEN'
      const user_cart = await pg('carts').where('user_id', userId)
        .where('status', cart_status).first();

      if (!user_cart) {
        return null
      }

      const user_cart_items = await pg('cart_items').join('products', 'cart_items.product_id', 'products.id')
        .where('cart_id', user_cart.id);
      // const user_cart_full = await pg('cart_full').where('user_id = ?', [userId]);
      return { ...user_cart, items: [...user_cart_items] }
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  };

  async createByUserId(userId: string): Promise<Cart> {
    try {

      const create_by_userid = await pg.raw('SELECT * FROM create_cart(?::UUID)', userId)
      return create_by_userid
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  };

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    try {
      const user_cart = await this.findByUserId(userId);
      if (user_cart) {
        return user_cart;
      };
      console.log('No such user found, creating...');
      return await this.createByUserId(userId);
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async updateByUserId(userId: string, RequestBody): Promise<Cart> {
    try {
      const productCount = RequestBody.count;
      const productId = RequestBody.product_id;

      const user_cart = await this.findOrCreateByUserId(userId);

      const update_cart = await pg.raw(
        'SELECT * FROM cart_add(?::UUID, ?::UUID, ?::INTEGER)', [user_cart.id, productId, productCount]
        );
      console.log('Cart Updated', user_cart.id);
      const user_cart_items = await pg('cart_items').join('products', 'cart_items.product_id', 'products.id')
        .where('cart_id', user_cart.id);

      return { ...user_cart, items: [...user_cart_items] }

    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async removeByUserId(userId): Promise<void> {
    try {
      console.log('Removing user', userId)
      const cart_to_remove = await this.findByUserId(userId);
      await pg('cart_items').where('cart_id', cart_to_remove.id).del();
      await pg('carts').where('user_id', userId).del();
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async changeStatus(trx: Knex.Transaction<any, any[]>, cartId:string) {
    console.log('we are changing status of cart', cartId)
    return await trx('carts')
      .where('id', cartId)
      .update({ status : 'ORDERED' })
      .returning('status')
  }

}
