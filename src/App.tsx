/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Smartphone, Tablet, Watch, Laptop, 
  Search, Plus, MapPin, TrendingUp, 
  Settings, Package, Wrench, ClipboardList,
  CheckCircle2, Clock, IndianRupee,
  ChevronRight, LayoutDashboard, Rocket,
  LogOut, LogIn
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Repair, InventoryItem } from "./types";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { 
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User 
} from "firebase/auth";
import { 
  collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy 
} from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Form states
  const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newDeviceModel, setNewDeviceModel] = useState("");
  const [newDeviceType, setNewDeviceType] = useState<Repair['deviceType']>("iPhone");
  const [newDescription, setNewDescription] = useState("");

  // Edit states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editRepairId, setEditRepairId] = useState<string | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editDeviceModel, setEditDeviceModel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<Repair['status']>("pickdrop");
  const [editQuotation, setEditQuotation] = useState<string>("0");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        toast.success(`Welcome back, ${u.displayName}`);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRepairs([]);
      setInventory([]);
      return;
    }

    const qRepairs = query(collection(db, "repairs"), orderBy("createdAt", "desc"));
    const unsubRepairs = onSnapshot(qRepairs, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Repair));
      setRepairs(docs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "repairs"));

    const qInventory = query(collection(db, "inventory"), orderBy("name", "asc"));
    const unsubInventory = onSnapshot(qInventory, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
      setInventory(docs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "inventory"));

    return () => {
      unsubRepairs();
      unsubInventory();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      toast.error("Login failed");
    }
  };

  const handleLogout = () => signOut(auth);

  const createRepairJob = async () => {
    if (!user) return;
    const toastId = toast.loading("Creating job...");
    try {
      const trackingId = `IFXP-${Math.floor(1000 + Math.random() * 9000)}`;
      await addDoc(collection(db, "repairs"), {
        trackingId,
        customerName: newCustomerName,
        customerPhone: newCustomerPhone,
        deviceModel: newDeviceModel,
        deviceType: newDeviceType,
        status: "pickdrop",
        description: newDescription,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.dismiss(toastId);
      toast.success("Repair job registered!", { description: `Tracking ID: ${trackingId}` });
      // Reset form
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewDeviceModel("");
      setNewDescription("");
      setIsNewJobDialogOpen(false);
    } catch (e) {
      toast.dismiss(toastId);
      handleFirestoreError(e, OperationType.CREATE, "repairs");
    }
  };

  const updateRepairStatus = async (id: string, newStatus: Repair['status']) => {
    try {
      await updateDoc(doc(db, "repairs", id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success("Status updated to " + newStatus);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `repairs/${id}`);
    }
  };

  const handleOpenEdit = (job: Repair) => {
    setEditRepairId(job.id);
    setEditCustomerName(job.customerName);
    setEditCustomerPhone(job.customerPhone);
    setEditDeviceModel(job.deviceModel);
    setEditDescription(job.description);
    setEditStatus(job.status);
    setEditQuotation(job.quotationAmount?.toString() || "0");
    setIsEditDialogOpen(true);
  };

  const saveRepairEdit = async () => {
    if (!editRepairId) return;
    const toastId = toast.loading("Updating repair details...");
    try {
      await updateDoc(doc(db, "repairs", editRepairId), {
        customerName: editCustomerName,
        customerPhone: editCustomerPhone,
        deviceModel: editDeviceModel,
        description: editDescription,
        status: editStatus,
        quotationAmount: parseFloat(editQuotation) || 0,
        updatedAt: serverTimestamp()
      });
      toast.dismiss(toastId);
      toast.success("Repair updated successfully");
      setIsEditDialogOpen(false);
    } catch (e) {
      toast.dismiss(toastId);
      handleFirestoreError(e, OperationType.UPDATE, `repairs/${editRepairId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pickdrop": return "bg-blue-100 text-blue-700 border-blue-200";
      case "repair": return "bg-orange-100 text-orange-700 border-orange-200";
      case "quotation": return "bg-purple-100 text-purple-700 border-purple-200";
      case "completed": return "bg-green-100 text-green-700 border-green-200";
      case "delivered": return "bg-slate-100 text-slate-700 border-slate-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "iPhone": return <Smartphone className="w-4 h-4" />;
      case "iPad": return <Tablet className="w-4 h-4" />;
      case "iWatch": return <Watch className="w-4 h-4" />;
      case "MacBook": return <Laptop className="w-4 h-4" />;
      default: return null;
    }
  };

  const getNextStatus = (current: Repair['status']): Repair['status'] | null => {
    switch (current) {
      case 'pickdrop': return 'repair';
      case 'repair': return 'quotation';
      case 'quotation': return 'completed';
      case 'completed': return 'delivered';
      default: return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <Toaster position="top-right" />
        <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border-none">
          <div className="mx-auto w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-3xl font-bold">i</div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">iFixPune <span className="text-blue-600">Pro</span></h1>
            <p className="text-gray-500 mt-2">Enterprise Repair Management for Pune Branch</p>
          </div>
          <p className="text-sm text-gray-400">Sign in with your corporate account to access the dashboard and track repairs.</p>
          <Button onClick={handleLogin} className="w-full h-12 gap-2 bg-black hover:bg-black/90 text-lg">
            <LogIn size={20} /> Sign in with Google
          </Button>
          <div className="pt-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">93 Avenue Mall, Hadapsar, Pune</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      <Toaster position="top-right" />
      
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-[#E5E7EB] z-10 hidden md:flex flex-col">
        <div className="p-6 border-bottom mb-4">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center">i</span>
            iFixPune <span className="text-blue-600">Pro</span>
          </div>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-semibold">Hadapsar Branch</div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <NavItem active={activeTab === "repairs"} onClick={() => setActiveTab("repairs")} icon={<ClipboardList size={18} />} label="Repair Jobs" />
          <NavItem active={activeTab === "inventory"} onClick={() => setActiveTab("inventory")} icon={<Package size={18} />} label="Inventory" />
          <NavItem active={activeTab === "roadmap"} onClick={() => setActiveTab("roadmap")} icon={<Rocket size={18} />} label="Business Plan" />
        </nav>

        <div className="p-4 border-t border-[#E5E7EB] space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
                {user?.displayName?.charAt(0) || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{user?.displayName || "User"}</div>
              <div className="text-[10px] text-gray-500 truncate leading-none mt-0.5">Pune Manager</div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 h-9"
          >
            <LogOut size={16} /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-8 pt-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">
              {activeTab === "dashboard" && "Performance Overview"}
              {activeTab === "repairs" && "Track Repairs"}
              {activeTab === "inventory" && "Stock & Tools Management"}
              {activeTab === "roadmap" && "Growth Strategy"}
            </h1>
            <p className="text-sm text-gray-500">
              {activeTab === "dashboard" && "Real-time metrics for 93 Avenue, Pune"}
              {activeTab === "repairs" && "Manage lifecycle of device repairs"}
              {activeTab === "inventory" && "Track spare parts and professional tools"}
              {activeTab === "roadmap" && "Expanding from 200 sqft to Pune-wide"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Search serial / ID..." 
                className="pl-9 h-9 w-[240px] bg-white border-gray-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button className="h-9 gap-2 bg-black hover:bg-black/90" onClick={() => setIsNewJobDialogOpen(true)}>
              <Plus size={16} /> New Job
            </Button>
          </div>
        </header>

        <Dialog open={isNewJobDialogOpen} onOpenChange={setIsNewJobDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Register New Repair</DialogTitle>
              <DialogDescription>Enter customer and device details for tracking.</DialogDescription>
            </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="custName" className="text-right">Customer</Label>
                    <Input 
                      id="custName" 
                      className="col-span-3" 
                      placeholder="Full name" 
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="custPhone" className="text-right">Phone</Label>
                    <Input 
                      id="custPhone" 
                      className="col-span-3" 
                      placeholder="+91..." 
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="device" className="text-right">Device</Label>
                    <Select onValueChange={(v: any) => setNewDeviceType(v)} value={newDeviceType}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select device" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iPhone">iPhone</SelectItem>
                        <SelectItem value="iPad">iPad</SelectItem>
                        <SelectItem value="iWatch">iWatch</SelectItem>
                        <SelectItem value="MacBook">MacBook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="model" className="text-right">Model</Label>
                    <Input 
                      id="model" 
                      className="col-span-3" 
                      placeholder="e.g. iPhone 15 Pro" 
                      value={newDeviceModel}
                      onChange={(e) => setNewDeviceModel(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="issue" className="text-right text-xs">Issue</Label>
                    <Input 
                      id="issue" 
                      className="col-span-3 text-xs" 
                      placeholder="Describe the issue" 
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={createRepairJob}>Create Tracking ID</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Edit Repair Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Repair Details</DialogTitle>
                  <DialogDescription>Update customer or device tracking information.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editCustName" className="text-right">Customer</Label>
                    <Input 
                      id="editCustName" 
                      className="col-span-3" 
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editPhone" className="text-right">Phone</Label>
                    <Input 
                      id="editPhone" 
                      className="col-span-3" 
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editModel" className="text-right">Model</Label>
                    <Input 
                      id="editModel" 
                      className="col-span-3" 
                      value={editDeviceModel}
                      onChange={(e) => setEditDeviceModel(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editStatus" className="text-right">Status</Label>
                    <Select onValueChange={(v: any) => setEditStatus(v)} value={editStatus}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pickdrop">Pick & Drop</SelectItem>
                        <SelectItem value="repair">In Repair</SelectItem>
                        <SelectItem value="quotation">Quotation Sent</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editQuotation" className="text-right">Quotation (₹)</Label>
                    <Input 
                      id="editQuotation" 
                      type="number"
                      className="col-span-3" 
                      value={editQuotation}
                      onChange={(e) => setEditQuotation(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="editDesc" className="text-right text-xs">Notes</Label>
                    <Input 
                      id="editDesc" 
                      className="col-span-3 text-xs" 
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                  <Button onClick={saveRepairEdit}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<Clock className="text-orange-500" />} label="In Repair" value="12" sub="Avg: 2.4 hrs" />
                  <StatCard icon={<CheckCircle2 className="text-green-500" />} label="Completed Today" value="08" sub="+2 from yesterday" />
                  <StatCard icon={<IndianRupee className="text-blue-500" />} label="Est. Revenue" value="₹42,500" sub="Month-to-date" />
                  <StatCard icon={<TrendingUp className="text-purple-500" />} label="Customer CSAT" value="4.9/5" sub="Top in Hadapsar" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 border-[#E5E7EB] shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg font-bold">Recent Repair Jobs</CardTitle>
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700" onClick={() => setActiveTab("repairs")}>View All</Button>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-[#F3F4F6]">
                            <TableHead className="font-semibold text-gray-500">Tracking ID</TableHead>
                            <TableHead className="font-semibold text-gray-500">Customer</TableHead>
                            <TableHead className="font-semibold text-gray-500">Device</TableHead>
                            <TableHead className="font-semibold text-gray-500 text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {repairs.map((job) => (
                            <TableRow key={job.id} className="border-[#F3F4F6]">
                              <TableCell className="font-mono text-xs font-bold text-blue-600">{job.trackingId}</TableCell>
                              <TableCell className="font-medium">{job.customerName}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm">
                                  {getDeviceIcon(job.deviceType)} {job.deviceModel}
                                </div>
                              </TableCell>
                              <TableCell className="text-right flex items-center justify-end gap-2">
                                {getNextStatus(job.status) && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-[10px] px-2 border-dashed"
                                    onClick={() => updateRepairStatus(job.id, getNextStatus(job.status)!)}
                                  >
                                    Next: {getNextStatus(job.status)}
                                  </Button>
                                )}
                                <Badge variant="outline" className={`capitalize font-medium ${getStatusColor(job.status)}`}>
                                  {job.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card className="border-[#E5E7EB] shadow-sm bg-black text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full translate-x-12 -translate-y-12"></div>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin size={20} className="text-blue-400" /> Hadapsar Branch
                      </CardTitle>
                      <CardDescription className="text-gray-400">93 Avenue Mall, Shop G-12</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Space Utilization</div>
                        <div className="flex items-end justify-between">
                          <div className="text-2xl font-bold tracking-tight">200 sqft</div>
                          <div className="text-xs text-green-400 font-medium">Fully Optimized</div>
                        </div>
                        <div className="mt-2 w-full bg-white/10 h-1.5 rounded-full">
                          <div className="bg-blue-500 h-full w-[85%] rounded-full"></div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 leading-relaxed italic">
                        "Starting lean with 200 sqft in Pune's growing IT corridor. Every square inch counts for productivity."
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "repairs" && (
              <Card className="border-[#E5E7EB] shadow-sm">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Live Tracking System</CardTitle>
                      <CardDescription>All active and past repair jobs</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Export CSV</Button>
                      <Button variant="outline" size="sm">Filter by Status</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                   <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Customer / Phone</TableHead>
                        <TableHead>Device Details</TableHead>
                        <TableHead>Quotation</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repairs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="font-mono text-xs font-bold text-blue-600 mb-1">{job.trackingId}</div>
                            <Badge className={getStatusColor(job.status)} variant="outline">{job.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold">{job.customerName}</div>
                            <div className="text-xs text-gray-500">{job.customerPhone}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 font-medium">
                              {getDeviceIcon(job.deviceType)} {job.deviceModel}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 line-clamp-1">{job.description}</div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] bg-blue-50 text-blue-600 mt-2 px-2 hover:bg-blue-100"
                              onClick={async () => {
                                const toastId = toast.loading("AI is diagnosing...");
                                try {
                                  const res = await fetch("/api/ai/diagnose", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ device: job.deviceModel, issue: job.description })
                                  });
                                  const data = await res.json();
                                  toast.dismiss(toastId);
                                  toast.success("Diagnosis complete", {
                                    description: data.diagnosis,
                                    duration: 10000
                                  });
                                } catch (e) {
                                  toast.error("AI Diagnostic failed");
                                }
                              }}
                            >
                              Gemini Diagnosis
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            {job.quotationAmount ? `₹${job.quotationAmount.toLocaleString()}` : "Pending"}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right flex items-center justify-end gap-2">
                             {getNextStatus(job.status) && (
                               <Button 
                                 variant="outline" 
                                 size="sm" 
                                 className="h-8 text-xs gap-1"
                                 onClick={() => updateRepairStatus(job.id, getNextStatus(job.status)!)}
                               >
                                 Advance <ChevronRight size={14} />
                               </Button>
                             )}
                             <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(job)}><ChevronRight size={16} /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeTab === "inventory" && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                 <Card className="lg:col-span-3 border-[#E5E7EB] shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Parts & Tools Catalog</CardTitle>
                      <CardDescription>Manage stock levels for Apple genuine parts</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" className="gap-2">
                       <Plus size={14} /> Add Stock
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-bold">{item.name}</TableCell>
                            <TableCell>
                               <Badge variant="outline" className="font-normal">{item.category}</Badge>
                            </TableCell>
                            <TableCell className="capitalize flex items-center gap-2">
                              {item.type === 'part' ? <Package size={14} className="text-orange-500"/> : <Wrench size={14} className="text-blue-500"/>}
                              {item.type}
                            </TableCell>
                            <TableCell>
                               <span className={`px-2 py-1 rounded-md text-xs font-bold ${item.quantity < 3 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                 {item.quantity} in stock
                               </span>
                            </TableCell>
                            <TableCell className="text-right font-medium text-gray-600">₹{item.price}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <div className="space-y-6">
                   <Card className="border-orange-100 bg-orange-50/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <TrendingUp size={16} className="text-orange-500" /> Smart Restock
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-gray-600 space-y-3">
                      <p>AI Suggestion: High demand for iPhone 14/15 screens in Pune market. Increase stock by 20%.</p>
                      <Button variant="ghost" size="sm" className="w-full text-orange-600 border border-orange-200">Generate Order</Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "roadmap" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Rocket className="text-blue-600" /> Business Expansion Blueprint
                  </h2>
                  <div className="space-y-4">
                    <RoadmapItem 
                      step="01" 
                      title="Hadapsar Foundation" 
                      desc="Optimize 93 Avenue operations, build local reputation, and hit 40% margin." 
                      status="current"
                    />
                    <RoadmapItem 
                      step="02" 
                      title="Branch Expansion (East Pune)" 
                      desc="Launch in Amanora Town Centre & Magarpatta. Combined 1000 sqft footprint." 
                      status="pending"
                    />
                    <RoadmapItem 
                      step="03" 
                      title="iFixPune Mobile Fleet" 
                      desc="Launch on-call repair vans for residents of Koregaon Park & Kalyani Nagar." 
                      status="pending"
                    />
                    <RoadmapItem 
                      step="04" 
                      title="Certified Excellence & AMC" 
                      desc="Get all technicians Apple Certified. Launch Annual Maintenance Contracts (AMC) for startup offices in Hinjewadi." 
                      status="pending"
                    />
                    <RoadmapItem 
                      step="05" 
                      title="Pune Dominance" 
                      desc="Establish presence in Kothrud, Baner & Viman Nagar. 10+ locations with a central hub-and-spoke logistics model." 
                      status="pending"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <Card className="border-[#E5E7EB] shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Funding & Marketing Strategy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <section>
                        <h4 className="font-bold text-sm text-blue-600 uppercase tracking-wider mb-2">Funding Plan</h4>
                        <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                          <li><strong>Phase 1:</strong> Initial 5-7 Lakhs bootstrap for Hadapsar lease, specialized microscopic tools, and initial inventory.</li>
                          <li><strong>Phase 2:</strong> Angel/Seed Round (Pune Angels) targeting 40 Lakhs to fund the East Pune branch expansion and a dedicated logistics van.</li>
                          <li><strong>Phase 3:</strong> Institutional funding for state-wide expansion (iFixMaharashtra).</li>
                        </ul>
                      </section>

                      <section>
                        <h4 className="font-bold text-sm text-orange-600 uppercase tracking-wider mb-2">Attracting Clients</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                             <div className="font-bold mb-1">Hyper-Local SEO</div>
                             Target "iPhone repair Hadapsar" and Google Maps optimizations.
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                             <div className="font-bold mb-1">Social Proof</div>
                             Real-time repair videos on Insta/FB showing "genuine parts check".
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                             <div className="font-bold mb-1">Referral Node</div>
                             ₹500 store credit for every Apple device referral.
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                             <div className="font-bold mb-1">Corp Alliances</div>
                             Exclusive repair desks for Magarpatta IT employees.
                          </div>
                        </div>
                      </section>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active 
          ? "bg-black text-white shadow-lg shadow-black/10" 
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, sub: string }) {
  return (
    <Card className="border-[#E5E7EB] shadow-sm hover:border-gray-300 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</div>
        </div>
        <div className="text-2xl font-bold tracking-tight text-[#111827]">{value}</div>
        <div className="text-[10px] font-medium text-gray-400 mt-1 uppercase leading-none">{sub}</div>
      </CardContent>
    </Card>
  );
}

function RoadmapItem({ step, title, desc, status }: { step: string, title: string, desc: string, status: 'current' | 'pending' }) {
  return (
    <div className={`p-4 rounded-xl border-l-4 transition-all ${
      status === 'current' 
        ? "bg-blue-50 border-blue-600 shadow-sm" 
        : "bg-white border-gray-200"
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Step {step}</span>
        {status === 'current' && <Badge className="bg-blue-600 text-white border-none text-[8px] h-4">ACTIVE</Badge>}
      </div>
      <h3 className="font-bold text-[#111827]">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}

