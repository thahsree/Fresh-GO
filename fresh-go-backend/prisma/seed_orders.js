const { PrismaClient, OrderStatus, PaymentMethod, PaymentStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.user.findFirst({ where: { phone: '+919876543210' } });
  const hub = await prisma.hub.findFirst({ where: { code: 'HUB-CLT-01' } });
  const zone = await prisma.deliveryZone.findFirst();
  const products = await prisma.product.findMany({ take: 3 });

  if (!customer || !products.length) {
    console.log('Missing customer or products');
    return;
  }

  const sampleOrders = [
    {
      orderNumber: 'FF10281',
      status: OrderStatus.CONFIRMED,
      totalAmount: 480,
      subtotal: 450,
      deliveryFee: 30,
      prodIndex: 0,
      address: 'Near Beach Road, Kozhikode'
    },
    {
      orderNumber: 'FF10282',
      status: OrderStatus.CUTTING_PREPARING,
      totalAmount: 720,
      subtotal: 685,
      deliveryFee: 35,
      prodIndex: 1 % products.length,
      address: 'Mavoor Road, Flat 4B, Kozhikode'
    },
    {
      orderNumber: 'FF10283',
      status: OrderStatus.PACKED,
      totalAmount: 380,
      subtotal: 350,
      deliveryFee: 30,
      prodIndex: 2 % products.length,
      address: 'Palayam Junction, Kozhikode'
    },
    {
      orderNumber: 'FF10284',
      status: OrderStatus.DISPATCH_READY,
      totalAmount: 640,
      subtotal: 605,
      deliveryFee: 35,
      prodIndex: 0,
      address: 'Calicut Civil Station, Kozhikode'
    }
  ];

  for (const o of sampleOrders) {
    const prod = products[o.prodIndex];
    const existing = await prisma.order.findUnique({ where: { orderNumber: o.orderNumber } });
    if (!existing) {
      const created = await prisma.order.create({
        data: {
          orderNumber: o.orderNumber,
          customerId: customer.id,
          hubId: hub ? hub.id : null,
          zoneId: zone ? zone.id : null,
          status: o.status,
          subtotal: o.subtotal,
          deliveryFee: o.deliveryFee,
          totalAmount: o.totalAmount,
          paymentMethod: PaymentMethod.COD,
          paymentStatus: PaymentStatus.PENDING,
          deliveryAddressSnapshotJson: JSON.stringify({
            area: o.address,
            city: 'Kozhikode',
            zoneName: zone ? zone.name : 'Kozhikode Central'
          }),
          items: {
            create: [
              {
                productId: prod.id,
                quantity: 1,
                unitPrice: prod.basePrice,
                grossWeightGrams: 700,
                expectedNetWeightGrams: 500,
                subtotal: prod.basePrice
              }
            ]
          }
        }
      });
      console.log('Created order:', created.orderNumber, created.id, created.status);
    } else {
      console.log('Order already exists:', o.orderNumber);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
