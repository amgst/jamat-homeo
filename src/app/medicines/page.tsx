"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Medicine } from '@/lib/types';
import { isAuthenticated, logout } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pill, Plus, Search, LogOut, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MedicinesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const isAuth = isClient && isAuthenticated();

    useEffect(() => {
        if (isClient) {
            if (!isAuth) {
                router.replace('/login');
            } else {
                fetchMedicines();
            }
        }
    }, [isClient, isAuth, router]);

    const fetchMedicines = async () => {
        setIsLoading(true);
        try {
            const medicinesCollection = collection(db, 'medicines');
            const q = query(medicinesCollection, orderBy('name'));
            const medicinesSnapshot = await getDocs(q);
            const medicinesList = medicinesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
            setMedicines(medicinesList);
        } catch (error) {
            console.error("Error fetching medicines:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMedicine = async (medicineData: Omit<Medicine, 'id'>) => {
        try {
            await addDoc(collection(db, 'medicines'), medicineData);
            await fetchMedicines();
            setIsAddDialogOpen(false);
            toast({
                title: "Medicine Added",
                description: "Medicine has been successfully added to inventory.",
            });
        } catch (error) {
            console.error("Error adding medicine:", error);
            toast({
                title: "Error",
                description: "Failed to add medicine. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleUpdateMedicine = async (medicineData: Medicine) => {
        try {
            const medicineRef = doc(db, "medicines", medicineData.id);
            const { id, ...updateData } = medicineData;
            await updateDoc(medicineRef, updateData);
            await fetchMedicines();
            setEditingMedicine(null);
            setIsEditDialogOpen(false);
            toast({
                title: "Medicine Updated",
                description: "Medicine information has been successfully updated.",
            });
        } catch (error) {
            console.error("Error updating medicine:", error);
            toast({
                title: "Error",
                description: "Failed to update medicine. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteMedicine = async (medicineId: string) => {
        try {
            await deleteDoc(doc(db, 'medicines', medicineId));
            await fetchMedicines();
            toast({
                title: "Medicine Deleted",
                description: "Medicine has been removed from inventory.",
            });
        } catch (error) {
            console.error("Error deleting medicine:", error);
            toast({
                title: "Error",
                description: "Failed to delete medicine. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    const filteredMedicines = medicines.filter(medicine =>
        medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (medicine.manufacturer && medicine.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const lowStockMedicines = medicines.filter(medicine => 
        medicine.minStockLevel && medicine.stock <= medicine.minStockLevel
    );

    if (!isClient || !isAuth) {
        return <div>Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-card/50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="cursor-pointer" onClick={() => router.push('/')}>
                            <Logo />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                                Patients
                            </Button>
                            <Button variant="secondary">
                                Medicines
                            </Button>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Medicine Inventory</h1>
                        <p className="text-muted-foreground">Manage your medicine stock</p>
                    </div>
                    <MedicineDialog
                        medicine={null}
                        isOpen={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                        onSave={handleAddMedicine}
                        trigger={
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Medicine
                            </Button>
                        }
                    />
                </div>

                {lowStockMedicines.length > 0 && (
                    <Card className="mb-6 border-orange-200 bg-orange-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-800">
                                <AlertTriangle className="h-5 w-5" />
                                Low Stock Alert
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {lowStockMedicines.map(medicine => (
                                    <Badge key={medicine.id} variant="outline" className="border-orange-300">
                                        {medicine.name} ({medicine.stock} {medicine.unit})
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search medicines..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMedicines.map(medicine => (
                        <Card key={medicine.id}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{medicine.name}</CardTitle>
                                    <div className="flex gap-1">
                                        <MedicineDialog
                                            medicine={medicine}
                                            isOpen={isEditDialogOpen && editingMedicine?.id === medicine.id}
                                            onOpenChange={(open) => {
                                                setIsEditDialogOpen(open);
                                                if (open) setEditingMedicine(medicine);
                                                else setEditingMedicine(null);
                                            }}
                                            onSave={handleUpdateMedicine}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => handleDeleteMedicine(medicine.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Stock: {medicine.stock} {medicine.unit}</span>
                                        <span className="text-sm font-medium"></span>
                                    </div>
                                    {medicine.expiryDate && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Expires:</span>
                                            <span className="text-sm">{new Date(medicine.expiryDate).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    {medicine.manufacturer && (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Manufacturer:</span>
                                            <span className="text-sm">{medicine.manufacturer}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    );
}

interface MedicineDialogProps {
    medicine: Medicine | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (medicine: any) => void;
    trigger: React.ReactNode;
}

function MedicineDialog({ medicine, isOpen, onOpenChange, onSave, trigger }: MedicineDialogProps) {
    const [formData, setFormData] = useState({
        name: '',
        stock: 0,
        unit: 'tablets',
        expiryDate: '',
        batchNumber: '',
        manufacturer: '',
        price: 0,
        minStockLevel: 10,
    });

    useEffect(() => {
        if (medicine) {
            setFormData({
                name: medicine.name,
                stock: medicine.stock,
                unit: medicine.unit,
                expiryDate: medicine.expiryDate || '',
                batchNumber: medicine.batchNumber || '',
                manufacturer: medicine.manufacturer || '',
                price: medicine.price || 0,
                minStockLevel: medicine.minStockLevel || 10,
            });
        } else {
            setFormData({
                name: '',
                stock: 0,
                unit: 'tablets',
                expiryDate: '',
                batchNumber: '',
                manufacturer: '',
                price: 0,
                minStockLevel: 10,
            });
        }
    }, [medicine, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (medicine) {
            onSave({ ...medicine, ...formData });
        } else {
            onSave(formData);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{medicine ? 'Edit Medicine' : 'Add Medicine'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Medicine Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="stock">Stock</Label>
                            <Input
                                id="stock"
                                type="number"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="unit">Unit</Label>
                            <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tablets">Tablets</SelectItem>
                                    <SelectItem value="capsules">Capsules</SelectItem>
                                    <SelectItem value="ml">ML</SelectItem>
                                    <SelectItem value="grams">Grams</SelectItem>
                                    <SelectItem value="bottles">Bottles</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="manufacturer">Manufacturer</Label>
                        <Input
                            id="manufacturer"
                            value={formData.manufacturer}
                            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                            id="expiryDate"
                            type="date"
                            value={formData.expiryDate}
                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="minStockLevel">Minimum Stock Level</Label>
                        <Input
                            id="minStockLevel"
                            type="number"
                            value={formData.minStockLevel}
                            onChange={(e) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                        />
                    </div>
                    <Button type="submit" className="w-full">
                        {medicine ? 'Update Medicine' : 'Add Medicine'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}