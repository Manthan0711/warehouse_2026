import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Mail, Phone, MapPin, Clock, ArrowRight, Send } from "lucide-react";
import { Link } from "react-router-dom";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    message: "",
    inquiryType: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log("Form submitted:", formData);
    // Show success message or redirect
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const contactInfo = [
    {
      title: "Email Us",
      content: "hello@smartwarehouse.in",
      subContent: "We'll respond within 24 hours",
      icon: Mail
    },
    {
      title: "Call Us",
      content: "+91 98765 43210",
      subContent: "Mon-Fri, 9:00 AM - 6:00 PM IST",
      icon: Phone
    },
    {
      title: "Visit Us",
      content: "WeWork, BKC, Mumbai",
      subContent: "Schedule an appointment",
      icon: MapPin
    },
    {
      title: "Business Hours",
      content: "Monday - Friday",
      subContent: "9:00 AM - 6:00 PM IST",
      icon: Clock
    }
  ];

  const offices = [
    {
      city: "Mumbai",
      address: "WeWork, Bandra Kurla Complex, Mumbai, Maharashtra 400051",
      phone: "+91 98765 43210",
      email: "mumbai@smartwarehouse.in"
    },
    {
      city: "Delhi",
      address: "DLF Cyber City, Gurgaon, Haryana 122002",
      phone: "+91 98765 43211",
      email: "delhi@smartwarehouse.in"
    },
    {
      city: "Bangalore",
      address: "Embassy Tech Village, Outer Ring Road, Bangalore, Karnataka 560103",
      phone: "+91 98765 43212",
      email: "bangalore@smartwarehouse.in"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="font-bold text-xl text-gray-900">SmartWarehouse</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/warehouses" className="text-gray-600 hover:text-gray-900 font-medium">Find Warehouses</Link>
            <Link to="/list-property" className="text-gray-600 hover:text-gray-900 font-medium">List Your Property</Link>
            <Link to="/about" className="text-gray-600 hover:text-gray-900 font-medium">About</Link>
            <Link to="/contact" className="text-blue-600 font-medium">Contact</Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Get in
              <span className="block text-blue-600">Touch</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Have questions? Need help finding the perfect warehouse space? Our team is here to help. 
              Reach out to us and we'll get back to you as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <info.icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-lg mb-2">{info.title}</CardTitle>
                <CardDescription className="text-base font-medium text-gray-900 mb-1">
                  {info.content}
                </CardDescription>
                <CardDescription className="text-sm">
                  {info.subContent}
                </CardDescription>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Send us a Message
              </h2>
              <p className="text-gray-600 mb-8">
                Fill out the form below and our team will get back to you within 24 hours.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="your.email@company.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <Input
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                      placeholder="Your company name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inquiry Type *
                  </label>
                  <Select value={formData.inquiryType} onValueChange={(value) => handleInputChange("inquiryType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inquiry type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="find-warehouse">Looking for Warehouse Space</SelectItem>
                      <SelectItem value="list-property">Want to List My Property</SelectItem>
                      <SelectItem value="partnership">Partnership Opportunities</SelectItem>
                      <SelectItem value="support">Technical Support</SelectItem>
                      <SelectItem value="media">Media & Press</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <Input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleInputChange("subject", e.target.value)}
                    placeholder="Brief subject of your inquiry"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    placeholder="Tell us more about your requirements or inquiry..."
                    rows={6}
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full">
                  <Send className="mr-2 h-5 w-5" />
                  Send Message
                </Button>
              </form>
            </div>

            {/* Office Locations */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Our Offices
              </h2>
              <p className="text-gray-600 mb-8">
                Visit us at any of our office locations across India. We'd love to meet you in person.
              </p>

              <div className="space-y-6">
                {offices.map((office, index) => (
                  <Card key={index} className="p-6">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl text-blue-600">{office.city}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <p className="text-gray-600">{office.address}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <p className="text-gray-600">{office.phone}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <p className="text-gray-600">{office.email}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-lg text-gray-900 mb-3">
                  Preferred Communication Method
                </h3>
                <p className="text-gray-600 mb-4">
                  For fastest response, email us at <strong>hello@smartwarehouse.in</strong> or use the contact form. 
                  For urgent matters, call us directly.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" asChild>
                    <a href="mailto:hello@smartwarehouse.in">
                      <Mail className="mr-2 h-4 w-4" />
                      Email Us
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="tel:+919876543210">
                      <Phone className="mr-2 h-4 w-4" />
                      Call Us
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Quick answers to common questions. Can't find what you're looking for? Contact us directly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6">
              <CardTitle className="text-lg mb-3">How do I list my warehouse?</CardTitle>
              <CardDescription className="text-base">
                Simply click on "List Your Property" and fill out our detailed form. Our team will verify 
                the details and get your listing live within 24 hours.
              </CardDescription>
            </Card>
            
            <Card className="p-6">
              <CardTitle className="text-lg mb-3">Are there any listing fees?</CardTitle>
              <CardDescription className="text-base">
                Basic listings are free. We only charge a small commission when you successfully 
                rent out your space. No upfront costs, no hidden fees.
              </CardDescription>
            </Card>
            
            <Card className="p-6">
              <CardTitle className="text-lg mb-3">How do I search for warehouses?</CardTitle>
              <CardDescription className="text-base">
                Use our advanced search filters to find warehouses by location, size, price, and amenities. 
                You can save searches and get notified when new matching properties are listed.
              </CardDescription>
            </Card>
            
            <Card className="p-6">
              <CardTitle className="text-lg mb-3">Is the platform secure?</CardTitle>
              <CardDescription className="text-base">
                Yes, all warehouses are verified by our team. We use bank-level security for all 
                transactions and personal information. Your data is always protected.
              </CardDescription>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" variant="outline" asChild>
              <Link to="/faq">
                View All FAQs
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-blue-100">
              Join thousands of businesses already using SmartWarehouse to find and list warehouse spaces.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600" asChild>
                <Link to="/warehouses">Browse Warehouses</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-blue-400" />
                <span className="font-bold text-xl">SmartWarehouse</span>
              </div>
              <p className="text-gray-400">
                India's leading marketplace for warehouse space. Connecting businesses with the perfect storage solutions.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">For Businesses</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/warehouses" className="hover:text-white">Find Warehouses</Link></li>
                <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link to="/support" className="hover:text-white">Support</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">For Owners</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/list-property" className="hover:text-white">List Property</Link></li>
                <li><Link to="/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link to="/resources" className="hover:text-white">Resources</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/about" className="hover:text-white">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link to="/careers" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SmartWarehouse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
