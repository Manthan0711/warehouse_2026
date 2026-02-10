import React, { useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  Receipt, 
  Building, 
  MapPin, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Download, 
  Printer,
  CheckCircle,
  Hash
} from 'lucide-react';

interface BookingReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    warehouse_name: string;
    warehouse_location: string;
    warehouse_address?: string;
    seeker_name: string;
    seeker_email: string;
    seeker_phone?: string;
    company_name?: string;
    start_date: string;
    end_date: string;
    area_sqft: number;
    blocks_booked?: number[];
    total_amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    approved_at?: string;
  };
  type: 'seeker' | 'owner';
}

export default function BookingReceipt({ 
  isOpen, 
  onClose, 
  booking, 
  type 
}: BookingReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const generateReceiptNumber = () => {
    const prefix = type === 'seeker' ? 'SR' : 'OR';
    return `${prefix}-${booking.id.substring(0, 8).toUpperCase()}`;
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.print();
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Create a simple text receipt for download
    const receiptText = `
SMARTSPACE WAREHOUSE BOOKING RECEIPT
====================================

Receipt No: ${generateReceiptNumber()}
Date: ${formatDate(new Date().toISOString())}
Status: ${booking.status.toUpperCase()}

WAREHOUSE DETAILS
-----------------
Name: ${booking.warehouse_name}
Location: ${booking.warehouse_location}
${booking.warehouse_address ? `Address: ${booking.warehouse_address}` : ''}

BOOKING DETAILS
---------------
Start Date: ${formatDate(booking.start_date)}
End Date: ${formatDate(booking.end_date)}
Area: ${booking.area_sqft.toLocaleString()} sq ft
${booking.blocks_booked ? `Blocks: ${booking.blocks_booked.join(', ')}` : ''}

${type === 'owner' ? 'CUSTOMER' : 'BOOKED BY'}
---------
Name: ${booking.seeker_name}
Email: ${booking.seeker_email}
${booking.seeker_phone ? `Phone: ${booking.seeker_phone}` : ''}
${booking.company_name ? `Company: ${booking.company_name}` : ''}

PAYMENT DETAILS
---------------
Payment Method: ${booking.payment_method}
Total Amount: ${formatCurrency(booking.total_amount)}

====================================
Thank you for using SmartSpace!
For support: support@smartspace.com
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${generateReceiptNumber()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Calculate duration
  const getDurationDays = () => {
    if (!booking.start_date || !booking.end_date) return 0;
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white text-gray-900 print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Receipt className="w-5 h-5 text-blue-600" />
            Booking Receipt
          </DialogTitle>
        </DialogHeader>

        {/* Printable Receipt Content */}
        <div ref={receiptRef} className="space-y-4 p-2">
          {/* Header */}
          <div className="text-center border-b-2 border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-blue-600">SmartSpace</h1>
            <p className="text-sm text-gray-500">Warehouse Booking Platform</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                {booking.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Receipt Info */}
          <div className="flex justify-between items-start text-sm">
            <div>
              <p className="text-gray-500">Receipt No.</p>
              <p className="font-mono font-bold">{generateReceiptNumber()}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">Date</p>
              <p className="font-medium">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>

          <Separator />

          {/* Warehouse Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Warehouse Details</h3>
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{booking.warehouse_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{booking.warehouse_location}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Booking Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs">Start Date</p>
                <p className="font-medium">{formatDate(booking.start_date)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs">End Date</p>
                <p className="font-medium">{formatDate(booking.end_date)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs">Duration</p>
                <p className="font-medium">{getDurationDays()} days</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs">Area</p>
                <p className="font-medium">{booking.area_sqft.toLocaleString()} sq ft</p>
              </div>
            </div>
            {booking.blocks_booked && booking.blocks_booked.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Blocks Booked</p>
                <div className="flex flex-wrap gap-1">
                  {booking.blocks_booked.map(block => (
                    <Badge key={block} variant="outline" className="text-xs">
                      #{block}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customer Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {type === 'owner' ? 'Customer Details' : 'Booked By'}
            </h3>
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{booking.seeker_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{booking.seeker_email}</span>
                </div>
                {booking.seeker_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{booking.seeker_phone}</span>
                  </div>
                )}
                {booking.company_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building className="w-4 h-4" />
                    <span>{booking.company_name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Payment Summary */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Payment Summary</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2 text-sm">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium capitalize">{booking.payment_method}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">{formatCurrency(booking.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 pt-4 border-t">
            <p>Thank you for choosing SmartSpace!</p>
            <p className="mt-1">For support, contact: support@smartspace.com</p>
            <p className="mt-1 font-mono text-gray-400">ID: {booking.id}</p>
          </div>
        </div>

        {/* Action Buttons (hidden when printing) */}
        <div className="flex gap-3 mt-4 print:hidden">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex-1"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            onClick={handleDownload}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
