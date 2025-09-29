// src/App.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import {
  Calendar,
  Clock,
  Users,
  FileText,
  Ship,
  User,
  MapPin,
  Hash,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const getTodayDate = () => new Date().toISOString().split("T")[0];
  const getCurrentTime = () => new Date().toTimeString().slice(0, 5);

  const restaurantsList = [
    "دار نورة",
    "وردة",
    "سكند كب",
    "موخيتو",
    "كيمس",
    "انكل زاك",
    "نيليرا/ عشق الخليج",
    "اخري",
  ];

  const initialForm = {
    tripDate: getTodayDate(),
    tripTime: getCurrentTime(),
    tripDuration: "",
    durationHours: "",
    durationMinutes: "",
    numAttendees: "",
    tripCost: "",
    extraCost: "",
    extraService: "",
    tripType: "",
    restaurantName: [],
    vesselName: "أباظة",
    tripManager: "شركة أباظة",
    additionalNotes: "",
    isMall: false,
  };

  const [formData, setFormData] = useState(initialForm);
  const [trips, setTrips] = useState([]); // load from server

  // Fetch trips from backend
  const fetchTrips = async () => {
    try {
      const res = await axios.get(`${API}/api/trips`);
      setTrips(res.data || []);
    } catch (err) {
      console.error("Fetching trips failed:", err);
      toast.error("فشل في تحميل الرحلات من السيرفر");
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTripTypeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      tripType: value,
      restaurantName:
        value === "foodBeverage" || value === "drink" ? prev.restaurantName : [],
    }));
  };

  const toggleRestaurant = (rest) => {
    setFormData((prev) => ({
      ...prev,
      restaurantName: prev.restaurantName.includes(rest)
        ? prev.restaurantName.filter((r) => r !== rest)
        : [...prev.restaurantName, rest],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // validations (same as before)
    const requiredFields = [
      "tripDate",
      "tripTime",
      "tripDuration",
      "numAttendees",
      "tripType",
      "vesselName",
      "tripManager",
    ];
    const missing = requiredFields.filter((f) => {
      const val = formData[f];
      return val === undefined || val === null || String(val).trim() === "";
    });
    if (missing.length > 0) {
      toast.error("يرجى ملء جميع الحقول المطلوبة", {
        position: "top-center",
        duration: 6000,
      });
      return;
    }

    if (!formData.isMall) {
      if (!formData.tripCost || Number(formData.tripCost) <= 0) {
        toast.error("⚠️ تكلفة الرحلة يجب أن تكون أكبر من صفر", {
          position: "top-center",
          duration: 6000,
        });
        return;
      }
    }

    if (
      (formData.tripType === "foodBeverage" || formData.tripType === "drink") &&
      (!formData.restaurantName || formData.restaurantName.length === 0)
    ) {
      toast.warning("يرجى اختيار مطعم واحد على الأقل", {
        position: "top-center",
        duration: 6000,
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.tripDate);
    if (selectedDate < today) {
      toast.error("لا يمكن تسجيل رحلة بتاريخ قديم", {
        position: "top-center",
        duration: 6000,
      });
      return;
    }

    // prepare payload: server will compute tripNumber, costs, total
    const payload = {
      ...formData,
      // ensure numeric fields are numbers
      tripCost: Number(formData.tripCost || 0),
      extraCost: Number(formData.extraCost || 0),
      numAttendees: Number(formData.numAttendees || 0),
      tripDuration:
        formData.tripDuration ||
        `${formData.durationHours || "00"}:${formData.durationMinutes || "00"}`,
    };

    try {
      const res = await axios.post(`${API}/api/trips`, payload);
      if (res.status === 201 || res.status === 200) {
        toast.success("تم تسجيل الرحلة بنجاح!", {
          position: "top-center",
          duration: 4000,
        });
        // refresh list from server (server assigned tripNumber, timestamps)
        await fetchTrips();
        // reset form
        setFormData({
          ...initialForm,
          tripDate: getTodayDate(),
          tripTime: getCurrentTime(),
        });
      } else {
        throw new Error("Unexpected response");
      }
    } catch (err) {
      console.error("Error saving trip:", err);
      toast.error("حصل خطأ أثناء حفظ الرحلة");
    }
  };

  const exportToExcel = () => {
    if (trips.length === 0) {
      toast.error("لا توجد رحلات مسجلة للتصدير", {
        position: "top-center",
        duration: 6000,
      });
      return;
    }

    const worksheetData = trips.map((trip, idx) => ({
      "رقم الرحلة": trip.tripNumber || idx + 1,
      "تاريخ الرحلة": trip.tripDate,
      "وقت الرحلة": trip.tripTime,
      "مدة الرحلة": trip.tripDuration,
      "عدد المتواجدين": trip.numAttendees,
      "تكلفة الرحلة": trip.tripCost,
      "تكلفة الخدمات الإضافية": trip.extraCost,
      "نوع الخدمة الإضافية": trip.extraService || "-",
      "إجمالي التكلفة": trip.totalCost,
      "نوع الرحلة":
        trip.tripType === "nile"
          ? "رحلة نيلية"
          : trip.tripType === "drink"
          ? "مشروبات"
          : "طعام ومشروبات",
      "اسم المطعم":
        Array.isArray(trip.restaurantName) && trip.restaurantName.length > 0
          ? trip.restaurantName.join(" ، ")
          : "-",
      "اسم المركب/الزودياك": trip.vesselName,
      "المسؤول عن الرحلة": trip.tripManager,
      "تابعة للمول": trip.isMall ? "نعم" : "لا",
      "ملاحظات إضافية": trip.additionalNotes || "-",
      "تاريخ التسجيل": trip.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "رحلات نايلوس");
    XLSX.writeFile(
      wb,
      `naylos_trips_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const formatDuration = (duration) => {
    if (!duration) return "-";
    const [h, m] = duration.split(":").map(Number);
    let result = [];
    if (h > 0) result.push(`${h} ${h === 1 ? "ساعة" : "ساعات"}`);
    if (m > 0) result.push(`${m} دقيقة`);
    return result.join(" و ") || "0 دقيقة";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-blue-900 flex items-center justify-center gap-3">
            <Ship className="h-10 w-10" /> استمارة تسجيل رحلات نيلية
          </h1>
          <p className="text-blue-700 text-lg">مشروع نايلوس</p>
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
            <MapPin className="h-4 w-4" /> نادي النيل لضباط الشرطة - شارع النيل - حي الدقي - الجيزة
          </div>
        </div>

        {/* Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-blue-900 flex items-center gap-2">
              <FileText className="h-6 w-6" /> تسجيل رحلة جديدة
            </CardTitle>
            <CardDescription>يرجى ملء جميع البيانات المطلوبة لتسجيل الرحلة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trip Date */}
                <div className="space-y-2">
                  <Label htmlFor="tripDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> تاريخ الرحلة *
                  </Label>
                  <Input
                    id="tripDate"
                    name="tripDate"
                    type="date"
                    value={formData.tripDate}
                    min={getTodayDate()}
                    onChange={handleInputChange}
                    className="text-right"
                  />
                </div>

                {/* Trip Number (preview) */}
                <div className="space-y-2">
                  <Label htmlFor="tripNumber" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" /> رقم الرحلة
                  </Label>
                  <Input
                    id="tripNumber"
                    type="text"
                    value={
                      formData.tripDate
                        ? trips.filter((t) => t.tripDate === formData.tripDate).length + 1
                        : ""
                    }
                    readOnly
                    className="text-right bg-gray-100"
                  />
                </div>

                {/* Trip Time */}
                <div className="space-y-2">
                  <Label htmlFor="tripTime" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> وقت الرحلة *
                  </Label>
                  <Input
                    id="tripTime"
                    name="tripTime"
                    type="time"
                    value={formData.tripTime}
                    onChange={handleInputChange}
                    className="text-right"
                  />
                </div>

                {/* Trip Duration */}
                <div className="space-y-2">
                  <Label htmlFor="tripDuration" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> مدة الرحلة *
                  </Label>
                  <div className="flex gap-3">
                    <select
                      className="border rounded-md p-2 text-right w-1/2"
                      value={formData.durationHours || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          durationHours: e.target.value,
                          tripDuration: `${e.target.value.padStart(2, "0")}:${(
                            prev.durationMinutes || "00"
                          ).padStart(2, "0")}`,
                        }))
                      }
                    >
                      <option value="">ساعات</option>
                      {[...Array(25).keys()].map((h) => (
                        <option key={h} value={String(h).padStart(2, "0")}>
                          {h} ساعة
                        </option>
                      ))}
                    </select>
                    <select
                      className="border rounded-md p-2 text-right w-1/2"
                      value={formData.durationMinutes || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          durationMinutes: e.target.value,
                          tripDuration: `${(
                            prev.durationHours || "00"
                          ).padStart(2, "0")}:${e.target.value.padStart(2, "0")}`,
                        }))
                      }
                    >
                      <option value="">دقايق</option>
                      {[...Array(60).keys()].map((m) => (
                        <option key={m + 1} value={String(m + 1).padStart(2, "0")}>
                          {m + 1} دقيقة
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Number of Attendees */}
                <div className="space-y-2">
                  <Label htmlFor="numAttendees" className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> عدد المتواجدين *
                  </Label>
                  <Input
                    id="numAttendees"
                    name="numAttendees"
                    type="number"
                    min="1"
                    value={formData.numAttendees}
                    onChange={handleInputChange}
                    className="text-right"
                  />
                </div>

                {/* Trip Cost */}
                <div className="space-y-2">
                  <Label htmlFor="tripCost" className="flex items-center gap-2">
                    💰 تكلفة الرحلة {formData.isMall ? "(غير مطلوبة)" : "*"}
                  </Label>
                  <Input
                    id="tripCost"
                    name="tripCost"
                    type="number"
                    min="1"
                    value={formData.tripCost}
                    onChange={handleInputChange}
                    disabled={formData.isMall}
                    className="text-right"
                  />
                </div>

                {/* Extra Services Cost */}
                <div className="space-y-2">
                  <Label htmlFor="extraCost" className="flex items-center gap-2">
                    💵 تكلفة الخدمات الإضافية
                  </Label>
                  <Input
                    id="extraCost"
                    name="extraCost"
                    type="number"
                    min="0"
                    value={formData.extraCost}
                    onChange={handleInputChange}
                    className="text-right"
                  />
                </div>

                {/* Extra Service Description */}
                <div className="space-y-2">
                  <Label htmlFor="extraService">🛠️ نوع الخدمة الإضافية</Label>
                  <Textarea
                    id="extraService"
                    name="extraService"
                    value={formData.extraService}
                    onChange={handleInputChange}
                    className="text-right"
                    rows={2}
                  />
                </div>

                {/* Vessel Name */}
                <div className="space-y-2">
                  <Label htmlFor="vesselName" className="flex items-center gap-2">
                    <Ship className="h-4 w-4" /> اسم المركب *
                  </Label>
                  <Input
                    id="vesselName"
                    name="vesselName"
                    type="text"
                    value={formData.vesselName}
                    readOnly
                    className="text-right bg-gray-100"
                  />
                </div>

                {/* Trip Manager */}
                <div className="space-y-2">
                  <Label htmlFor="tripManager" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> المسؤول *
                  </Label>
                  <Input
                    id="tripManager"
                    name="tripManager"
                    type="text"
                    value={formData.tripManager}
                    readOnly
                    className="text-right bg-gray-100"
                  />
                </div>
              </div>

              {/* Trip Type (single RadioGroup) */}
              <div className="space-y-3">
                <Label className="text-base font-medium">نوع الرحلة *</Label>
                <RadioGroup
                  value={formData.tripType}
                  onValueChange={handleTripTypeChange}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="nile" id="nile" />
                    <Label htmlFor="nile">رحلة نيلية فقط</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="foodBeverage" id="foodBeverage" />
                    <Label htmlFor="foodBeverage">رحلة طعام ومشروبات</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="drink" id="drink" />
                    <Label htmlFor="drink">رحلة مشروبات</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Restaurant Selection */}
              {(formData.tripType === "foodBeverage" || formData.tripType === "drink") && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-base font-medium">
                    <MapPin className="h-4 w-4" /> اختر المطعم *
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {restaurantsList.map((rest) => (
                      <div key={rest} className="flex items-center gap-2">
                        <Checkbox
                          id={rest}
                          checked={formData.restaurantName.includes(rest)}
                          onCheckedChange={() => toggleRestaurant(rest)}
                        />
                        <Label htmlFor={rest}>{rest}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="additionalNotes">✏️ ملاحظات إضافية</Label>
                <Textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  className="text-right"
                  rows={3}
                />
              </div>

              {/* Mall Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isMall"
                  name="isMall"
                  checked={formData.isMall}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      isMall: checked,
                      tripCost: checked ? "" : prev.tripCost,
                    }))
                  }
                />
                <Label htmlFor="isMall">رحلة مجانية تابعة للمول</Label>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full">
                ✅ تسجيل الرحلة
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Trips List */}
        {trips.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-blue-900">📋 الرحلات المسجلة</CardTitle>
                <CardDescription>عدد الرحلات: {trips.length}</CardDescription>
              </div>
              <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
                ⬇️ تصدير Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trips.map((trip) => (
                  <Card key={trip._id || trip.id} className="border shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-bold text-lg text-blue-800 flex items-center gap-2">
                        <Hash className="h-4 w-4" /> الرحلة رقم {trip.tripNumber}
                      </h3>
                      <p>📅 التاريخ: {trip.tripDate}</p>
                      <p>⏰ الوقت: {trip.tripTime}</p>
                      <p>⌛ المدة: {formatDuration(trip.tripDuration)}</p>
                      <p>👥 عدد الحضور: {trip.numAttendees}</p>
                      <p>🚤 المركب: {trip.vesselName}</p>
                      <p>👤 المسؤول: {trip.tripManager}</p>
                      <p>
                        🎯 النوع:{" "}
                        {trip.tripType === "nile"
                          ? "رحلة نيلية"
                          : trip.tripType === "drink"
                          ? "مشروبات"
                          : "طعام ومشروبات"}
                      </p>
                      {trip.restaurantName?.length > 0 && (
                        <p>🍽️ المطعم: {trip.restaurantName.join(" ، ")}</p>
                      )}
                      <p>💰 تكلفة الرحلة: {trip.tripCost} جنيه</p>
                      <p>💵 تكلفة الخدمات الإضافية: {trip.extraCost} جنيه</p>
                      {trip.extraService && <p>🛠️ الخدمة الإضافية: {trip.extraService}</p>}
                      <p className="font-bold text-green-700">
                        💯 التكلفة الكاملة: {trip.totalCost} جنيه
                      </p>
                      <p>🛒 تابعة للمول: {trip.isMall ? "نعم" : "لا"}</p>
                      {trip.additionalNotes && <p>✏️ ملاحظات: {trip.additionalNotes}</p>}
                      <p className="text-xs text-gray-500">📌 تم التسجيل: {trip.createdAt}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default App;
