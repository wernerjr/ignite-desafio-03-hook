import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {       
      const product = cart.find(product => product.id === productId);
      if(product){
        updateProductAmount({ productId, amount: product.amount + 1});   
      }else{      
        const response = await api.get<Product>(`/products/${productId}`);
        if(await verifyStock({productId, amount: 1})){ 
          const newProduct = { 
            ...response.data, 
            amount: 1,
          }
          setCart([...cart, newProduct]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, newProduct]));
        }else{
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      if(!product){
        throw new Error();
      }

      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if(amount < 1){
      return;
    }

    try {
      const product = cart.find(product => product.id === productId);
      if(!product){
        throw new Error();
      }

      if(await verifyStock({productId, amount})){      
        const updatedCart = cart.map(product => product.id === productId ? {...product, amount: amount} : product);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }else{
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  async function verifyStock({
    productId,
    amount,
  }: UpdateProductAmount): Promise<boolean> {
    try {     
      const response = await api.get<Stock>(`/stock/${productId}`)
      return response.data.amount >= amount;
    } catch {
      return false;
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
