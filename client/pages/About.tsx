import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Target, Award, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function About() {
  const stats = [
    { label: "Active Warehouses", value: "500+", icon: Building2 },
    { label: "Happy Clients", value: "1,200+", icon: Users },
    { label: "Cities Covered", value: "15+", icon: Target },
    { label: "Space Matched", value: "2M+ sq ft", icon: Award }
  ];

  const values = [
    {
      title: "Transparency",
      description: "We believe in complete transparency in all our dealings, providing accurate information and fair pricing.",
      icon: CheckCircle
    },
    {
      title: "Innovation",
      description: "Leveraging cutting-edge technology to make warehouse discovery and leasing seamless and efficient.",
      icon: Target
    },
    {
      title: "Customer First",
      description: "Our customers' success is our success. We go above and beyond to meet their warehouse space needs.",
      icon: Users
    },
    {
      title: "Quality Assurance",
      description: "Every warehouse on our platform is verified and meets our strict quality and safety standards.",
      icon: Award
    }
  ];

  const team = [
    {
      name: "Rajesh Kumar",
      role: "CEO & Founder",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
      bio: "20+ years in logistics and real estate"
    },
    {
      name: "Priya Sharma",
      role: "CTO",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&q=80",
      bio: "Former tech lead at major logistics companies"
    },
    {
      name: "Amit Patel",
      role: "Head of Operations",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
      bio: "Expert in warehouse operations and management"
    },
    {
      name: "Sneha Singh",
      role: "Head of Business Development",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
      bio: "Specialist in B2B partnerships and growth"
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
            <Link to="/about" className="text-blue-600 font-medium">About</Link>
            <Link to="/contact" className="text-gray-600 hover:text-gray-900 font-medium">Contact</Link>
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
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Revolutionizing
              <span className="block text-blue-600">Warehouse Discovery</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              SmartWarehouse is India's leading marketplace connecting businesses with the perfect warehouse spaces. 
              We're making warehouse discovery simple, transparent, and efficient for everyone.
            </p>
            <div className="grid md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <stat.icon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                We believe that finding the right warehouse space shouldn't be complicated, time-consuming, or opaque. 
                Our mission is to create a transparent, efficient marketplace where businesses can easily discover and 
                secure warehouse spaces that perfectly match their needs.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                By leveraging technology and building trust between warehouse owners and businesses, we're helping 
                optimize warehouse utilization across India while enabling businesses to scale efficiently.
              </p>
              <Button size="lg" asChild>
                <Link to="/warehouses">
                  Explore Warehouses
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80"
                  alt="Modern warehouse operations"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl shadow-xl border">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">98%</div>
                  <div className="text-sm text-gray-600">Customer Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Our Values
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center p-6 border-0 bg-white shadow-lg">
                <value.icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-lg mb-3">{value.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {value.description}
                </CardDescription>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experienced professionals passionate about transforming the warehouse industry
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center overflow-hidden">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <CardDescription className="text-blue-600 font-medium">
                    {member.role}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl lg:text-4xl font-bold mb-8">
              Our Story
            </h2>
            <div className="space-y-6 text-lg leading-relaxed">
              <p>
                SmartWarehouse was born out of a simple observation: finding warehouse space in India was 
                unnecessarily complex and time-consuming. Business owners would spend weeks calling brokers, 
                visiting properties, and negotiating terms without having a clear picture of what was available.
              </p>
              <p>
                Meanwhile, warehouse owners struggled to efficiently market their available spaces and connect 
                with the right tenants. This inefficiency was costing both sides time, money, and opportunities.
              </p>
              <p>
                Founded in 2023, we set out to create a technology-driven solution that would bring transparency, 
                efficiency, and trust to the warehouse rental market. Today, we're proud to be India's fastest-growing 
                warehouse marketplace, serving hundreds of businesses across the country.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Ready to Join Our Mission?
            </h2>
            <p className="text-xl text-gray-600">
              Whether you're looking for warehouse space or have space to offer, we'd love to help you succeed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/warehouses">
                  Find Warehouses
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/list-property">List Your Property</Link>
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
